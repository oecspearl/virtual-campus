# API Route Authentication Patterns

The canonical pattern for all **authenticated** API routes is `withTenantAuth()`.
Prefer this over inline `authenticateUser()` + `getTenantIdFromRequest()` boilerplate.

## The canonical pattern

```ts
import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

export const GET = withTenantAuth(async ({ user, tq, tenantId, request }) => {
  // user, tq, tenantId are ready to use — no boilerplate
  const { data } = await tq.from('courses').select('*');
  return NextResponse.json(data);
});
```

### With a role requirement

```ts
export const POST = withTenantAuth(
  async ({ user, tq, request }) => {
    // Handler runs only for admins/super_admins
    ...
  },
  { requiredRoles: ['admin', 'super_admin'] }
);
```

### Accessing request body and URL params

```ts
export const PUT = withTenantAuth(async ({ tq, request }) => {
  const body = await request.json();
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean).pop()!;
  ...
});
```

## When NOT to use `withTenantAuth()`

| Case | Why | What to use instead |
|------|-----|--------------------|
| **Public GET endpoints** | Allow unauthenticated access | Keep inline `authenticateUser()` with optional handling (check `authResult.success`) |
| **Auth callbacks** (`/api/auth/*`) | Called by OAuth providers, no session yet | Plain handler without `withTenantAuth` |
| **Cron routes** (`/api/cron/*`) | No user context, uses service role | Plain handler with `CRON_SECRET` check |
| **Webhooks** | External POST, no user session | Plain handler with webhook signature verification |
| **SCORM runtime** | Called by iframe with query-string token | Plain handler with custom auth |

## Context fields

The handler receives a `TenantAuthContext`:

- `user` — authenticated user profile (`id`, `email`, `name`, `role`)
- `tq` — tenant-scoped query builder (auto-applies `tenant_id` filter)
- `tenantId` — resolved tenant ID string
- `request` — the original `NextRequest`

Use `tq.raw` when you need the service client without tenant scoping
(e.g., `tq.raw.auth.admin.createUser`, cross-tenant super_admin queries).

## Migration status

The codebase is in the middle of migrating from inline auth to `withTenantAuth`.
When editing a route that still uses the inline pattern, take the opportunity
to migrate it — but verify the route's specific role rules and edge cases first.
Single-route migrations in dedicated commits are easier to review than bulk ones.
