# Observability — Axiom Setup & Alerts

We collect Vercel function logs in Axiom via the marketplace integration.
The integration injects `AXIOM_TOKEN` and `AXIOM_DATASET` into the project
and provisions a log drain — no code changes required.

All routes that import `@/lib/logger` emit JSON to stdout in production
(`{ level, message, timestamp, source, requestId, tenantId, userId, ... }`).
Axiom indexes every key as a queryable column.

---

## 1. Verify ingestion

After your next production deploy, hit any API route, then in Axiom run:

```apl
['vercel']
| where source != ""
| limit 50
```

You should see structured rows with `source`, `requestId`, `tenantId`, `userId`
as first-class columns. If `source` is empty, the route hasn't been migrated
to the structured logger yet (legacy `console.*` strings still flow through
as the raw `message` field, just without the structured columns).

---

## 2. Alert rules

Configure each in **Axiom UI → Monitors → New monitor**. Pipe notifications
to Slack (`#alerts-prod`) or PagerDuty as your team prefers.

### 2.1 — 5xx spike

```apl
['vercel']
| where statusCode >= 500
| summarize count() by bin(_time, 5m)
```

- **Type:** Threshold
- **Trigger:** `count > 10` in any 5-minute window
- **Cooldown:** 15 min

### 2.2 — Auth / tenant errors

```apl
['vercel']
| where source startswith "lib/api-auth" or source startswith "api/auth"
| where level == "error"
| summarize count() by bin(_time, 5m), source
```

- **Type:** Threshold
- **Trigger:** `count > 5` in any 5-minute window per `source`
- **Cooldown:** 15 min

### 2.3 — Per-tenant error rate (optional)

Catches a single tenant misbehaving without tripping the global 5xx alert.

```apl
['vercel']
| where level == "error" and tenantId != ""
| summarize errors = count() by bin(_time, 10m), tenantId
| where errors > 20
```

- **Type:** Threshold
- **Trigger:** any row returned
- **Cooldown:** 30 min

### 2.4 — Quiz attempt failures (LMS-specific)

Quiz attempts are the highest-stakes student action; failures hurt trust fast.

```apl
['vercel']
| where source startswith "api/quizzes" and level == "error"
| summarize count() by bin(_time, 5m), source
```

- **Type:** Threshold
- **Trigger:** `count > 3` in any 5-minute window
- **Cooldown:** 10 min

---

## 3. Useful saved queries

### "What broke for tenant X in the last hour?"

```apl
['vercel']
| where tenantId == "00000000-0000-0000-0000-000000000001"
| where _time > ago(1h)
| where level in ("error", "warn")
| project _time, source, level, message, requestId, userId, error
| order by _time desc
```

### "Trace a single request by ID"

```apl
['vercel']
| where requestId == "<paste-from-support-ticket>"
| order by _time asc
```

### Slow routes (p95)

```apl
['vercel']
| where durationMs > 0
| summarize p95 = percentile(durationMs, 95) by source
| order by p95 desc
| limit 20
```

---

## 4. Coverage notes

As of the structured-logger sweep, these route groups emit fully indexed
logs (with `source`, `tenantId`, `userId`, `requestId`):

- `app/api/auth/**` — all 7 files
- `app/api/quizzes/**` — all 12 files
- `app/api/courses/import/moodle`, `restore`, `route.ts`,
  `[id]/participants/[participantId]`, `[id]/groups`, `[id]/discussions`,
  `[id]/gradebook/quiz-sync` — the highest-traffic courses routes

The remaining `app/api/courses/**` routes (and other folders) still log
through `console.*`. Axiom captures these too, but without indexed columns
— queries against them will need string matching on `message`.

When migrating a new route, copy the pattern from any of the swept files:

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
