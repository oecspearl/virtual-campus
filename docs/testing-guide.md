# Testing Guide

The codebase uses [Vitest](https://vitest.dev) for unit and integration tests.
Coverage is measured by `@vitest/coverage-v8` with a regression floor —
thresholds can only go up.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode during development |
| `npm run test:coverage` | Run tests and produce a coverage report in `./coverage/` |

## Where tests live

Tests co-locate with the code they cover, under `__tests__` directories:

```
lib/
  __tests__/
    crypto-random.test.ts
    rbac.test.ts
    security.test.ts
    tenant-query.test.ts
    validations.test.ts
    with-tenant-auth.test.ts
  middleware/
    __tests__/
      auth-check.test.ts
      csrf-check.test.ts
      debug-block.test.ts
      tenant.test.ts
  moodle/
    __tests__/
      archive.test.ts
      utils.test.ts
```

## Current baseline (April 2026)

| Metric | Covered |
|--------|---------|
| Statements | 13.6% |
| Lines | 13.0% |
| Branches | 14.0% |
| Functions | 11.4% |

The threshold in `vitest.config.ts` is set just below baseline to act as a
regression floor. When you add tests that push coverage up, raise the
thresholds to match. **Never lower them.**

## Patterns

### Unit tests (pure functions)

No mocking needed — just import and assert. See `crypto-random.test.ts`,
`rbac.test.ts`, and `lib/middleware/__tests__/auth-check.test.ts` (for the
pure `isPublicPath` / `isExemptFromAuth` helpers).

### Middleware / function tests with mocked dependencies

Use `vi.mock()` at module scope to stub collaborators. Inside the test,
control the mock return with `vi.mocked(fn).mockReturnValueOnce(...)`.

See `lib/middleware/__tests__/csrf-check.test.ts` for an example mocking
`@/lib/security`.

### Database / Supabase tests

The service client is mocked with a chainable object that records each call.
See `lib/__tests__/tenant-query.test.ts` — the test inspects `chainRecorder`
to verify that the right SQL operations (e.g. `.eq('tenant_id', ...)`) were
applied.

### Mocking `NODE_ENV`

Use `vi.stubEnv('NODE_ENV', 'production')` with `beforeEach` / `afterEach` to
restore. See `lib/middleware/__tests__/debug-block.test.ts`.

## What's NOT yet tested

- **API route handlers** — we need route-level integration helpers
  (probably [msw](https://mswjs.io) for fetch mocking). Add these when
  migrating more routes to `withTenantAuth`.
- **React components** — no `@testing-library/react` setup yet. Add when
  decomposing god components (Issue #5 of the architectural assessment).
- **Most `lib/` domain modules** — crm, analytics, sonisweb, lti, etc. Coverage
  excludes them until they get their own tests.

## Writing new tests

1. Co-locate in the appropriate `__tests__/` folder.
2. Name files `*.test.ts` (or `.test.tsx` for components eventually).
3. Keep tests focused — one assertion per `it()` is easier to debug.
4. Prefer behaviour assertions (`tenant_id gets injected`) over implementation
   checks (`Supabase was called X times`).
5. After adding tests, run `npm run test:coverage` and raise the thresholds
   in `vitest.config.ts` if the new numbers are consistently higher.
