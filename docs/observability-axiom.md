# Observability — Axiom Setup, Monitors & Known Issues

Vercel function logs ship to Axiom via the marketplace integration
(`AXIOM_TOKEN` + `AXIOM_DATASET` are injected by the integration —
no code changes needed). The integration wraps every log line into a
single `Event` field with these auto-extracted columns:

| Column | What it is |
|---|---|
| `level` | log level (`info`, `warning`, `error`) |
| `message` | raw log text. For our structured logger calls, this is JSON-stringified. For Vercel-generated request summaries, it's `[GET] /api/path status=200` |
| `request.path` | route path |
| `request.statusCode` | HTTP status |
| `request.method` | HTTP method |
| `request.host`, `request.ip`, `request.userAgent` | request metadata |
| `report.durationMs`, `report.maxMemoryUsedMb` | function execution report |
| `vercel.deploymentId`, `vercel.region`, `vercel.source` (= `edge` / `lambda` / `lambda-log`), `vercel.route` | Vercel platform metadata |

**Important:** alerts should query the integration's columns
(`['request.statusCode']`, `['request.path']`) — not the fields inside
our app logger. Our logger output appears inside `message` as a JSON
string when `vercel.source == "lambda-log"`; useful for forensics, not
for monitor thresholds.

---

## 1. Quick verify (60s)

```apl
vercel
| where _time > ago(1h)
| count
```

Returns thousands → drain is healthy. If 0, the integration isn't
shipping function logs — check **Vercel → Integrations → Axiom → Log
drain** is enabled.

```apl
vercel
| where _time > ago(15m)
| limit 5
```

Confirms what columns the integration is populating right now.

---

## 2. Monitors

All three fire on Vercel's auto-summary lines, which are already
flowing — they don't depend on our app logger.

Set each up in **Axiom → Monitors → New monitor**, route notifications
to Slack (`#alerts-prod`) or PagerDuty.

### 2.1 — 5xx spike

```apl
vercel
| where _time > ago(10m)
| where ['request.statusCode'] >= 500
| summarize count() by bin(_time, 5m), ['request.path']
```

- Threshold: **count > 5 in any 5-minute window**
- Cooldown: 15 min

### 2.2 — Auth bombardment (likely brute force or token expiry storm)

```apl
vercel
| where _time > ago(10m)
| where ['request.statusCode'] == 401
| where ['request.path'] startswith "/api/auth"
| summarize count() by bin(_time, 5m), ['request.ip']
```

- Threshold: **count > 20 from any one IP in 5m**
- Cooldown: 15 min

### 2.3 — Function memory pressure

Catches the OOM pattern that pushed the team off Sentry. Function
limit is 1024MB; alerting at 900MB gives headroom to investigate
before the function actually crashes.

```apl
vercel
| where _time > ago(15m)
| where ['report.maxMemoryUsedMb'] > 900
| summarize max(['report.maxMemoryUsedMb']) by bin(_time, 5m), ['request.path']
```

- Threshold: **any row returned**
- Cooldown: 30 min

---

## 3. Useful forensic queries

### "What broke for this route in the last hour?"

```apl
vercel
| where _time > ago(1h)
| where ['request.path'] == "/api/courses"
| where ['request.statusCode'] >= 400
| project _time, ['request.method'], ['request.statusCode'], message, ['request.ip']
| order by _time desc
```

### "Trace a single request by Vercel ID"

```apl
vercel
| where ['request.id'] == "<paste-x-vercel-id-from-response-headers>"
| order by _time asc
```

The full request lifecycle is usually 3 rows: edge summary,
lambda-log lines (any `console.*` your code emitted), and the lambda
execution report.

### "Pull our structured logger fields out of a lambda-log row"

When investigating an error from a route covered by the sweep, our
logger emitted `JSON.stringify({level, source, requestId, tenantId, message, error, ...})`.
The `message` field IS that JSON string:

```apl
vercel
| where _time > ago(1h)
| where ['vercel.source'] == "lambda-log"
| where message startswith "{"
| extend parsed = parse_json(message)
| extend app_source = tostring(parsed.source),
         app_level = tostring(parsed.level),
         tenant_id = tostring(parsed.tenantId),
         user_id = tostring(parsed.userId)
| where app_level == "error"
| project _time, app_source, tostring(parsed.message), tenant_id, user_id, parsed.error
| order by _time desc
```

Save this as a view ("App Logger Errors") so on-call doesn't have to
rebuild the parse each time.

### Slow routes (p95)

```apl
vercel
| where _time > ago(1h)
| where ['report.durationMs'] > 0
| summarize p95 = percentile(['report.durationMs'], 95) by ['request.path']
| order by p95 desc
| limit 20
```

---

## 4. Logger sweep coverage

Routes that emit JSON-structured rows (with `source`/`requestId`/
`tenantId`/`userId` inside `message`) when they error:

- `app/api/auth/**` — all 7 files
- `app/api/quizzes/**` — all 12 files
- `app/api/courses/**` — `import/moodle`, `restore`, `route.ts`,
  `[id]/participants/[participantId]`, `[id]/groups`,
  `[id]/discussions`, `[id]/gradebook/quiz-sync`

The remaining ~280 routes still log through raw `console.*`. Axiom
captures these too; you just lose the indexed app columns and need
string matching on `message`.

To migrate a new route, copy the pattern:

```ts
import { createLogger } from '@/lib/logger';

export async function GET(request: Request) {
  const log = createLogger('api/your/route', request as any);
  try {
    // ...
    log.error('Specific failure', { contextField }, error);
  } catch (e) {
    log.error('GET handler crashed', undefined, e);
  }
}
```

---

## 5. Known issues

### 5.1 — Some nested `/api/*` routes return 404 in production

Affected (pre-existing, **not** caused by the logger sweep):

- `/api/auth/oauth/providers`, `/api/auth/oauth/authorize`, `/api/auth/oauth/callback`
- `/api/auth/google-meet/authorize`, `/api/auth/google-meet/callback`
- `/api/admin/tenants`

Working siblings: `/api/auth/profile`, `/api/auth/change-password`,
`/api/admin/users`, `/api/courses`.

**Ruled out:** middleware (debug-block, csrf-check, auth-check all
pass), env-var-at-import (`lib/oauth/state` reads env inside
functions only), missing build artifacts (all routes present in
`.next/standalone`).

**Worth checking:**

1. Vercel build log for the latest deploy — search for warnings about
   skipped routes.
2. The identity rewrite in [vercel.json](../vercel.json)
   `"source": "/api/(.*)" → "destination": "/api/$1"` — known to
   interfere with Vercel's file-based routing in some cases. Try
   removing it.
3. Function bundling: the failing routes share heavier transitive
   imports (`googleapis`, `lib/oauth/*`). Possible the bundler
   produces oversized output that Vercel silently drops.

Not a launch blocker if OAuth and Google Meet aren't required for the
first launch cohort.
