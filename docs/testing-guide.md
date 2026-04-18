# Testing Guide

The codebase uses [Vitest](https://vitest.dev) for unit, integration, and
component tests. Coverage is measured by `@vitest/coverage-v8` with a
regression floor — thresholds can only go up.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode during development |
| `npm run test:coverage` | Run tests and produce a coverage report in `./coverage/` |

## Environments

Two test environments share the same Vitest config:

| File suffix | Default environment | How to opt-in to jsdom |
|-------------|--------------------|------------------------|
| `.test.ts` | `node` (fast, no DOM) | — |
| `.test.tsx` | `node` by default | Add `// @vitest-environment jsdom` at the top |

The jsdom setup lives in [`vitest-setup.ts`](../vitest-setup.ts) — it wires
up `@testing-library/jest-dom` matchers (`toBeInTheDocument`,
`toBeEmptyDOMElement`, etc.) and runs React Testing Library's `cleanup()`
between tests.

## Where tests live

Tests co-locate with the code they cover, under `__tests__` directories:

```
lib/
  __tests__/                       — lib/* unit tests (node env)
    crypto-random.test.ts
    rbac.test.ts
    security.test.ts
    tenant-query.test.ts
    validations.test.ts
    with-tenant-auth.test.ts
  middleware/__tests__/
  services/__tests__/
  security/__tests__/
  video/__tests__/
app/
  components/media/__tests__/       — component tests (jsdom via pragma)
    VideoPlayer.routing.test.tsx
  components/media/video/__tests__/
    ChapterSidebar.test.tsx
    EmbedPlayer.test.tsx
```

## Current baseline (April 2026)

| Metric | Covered |
|--------|---------|
| Statements | 22.8% |
| Lines | 22.0% |
| Branches | 26.0% |
| Functions | 20.2% |

Thresholds in `vitest.config.ts` are set just below baseline as a regression
floor. When new tests push coverage up, raise the thresholds. **Never lower
them.**

## Patterns

### Unit tests (pure functions)

No mocking needed — just import and assert. See `lib/__tests__/crypto-random.test.ts`
and `lib/video/__tests__/utils.test.ts`.

### Function tests with mocked dependencies

Use `vi.mock()` at module scope to stub collaborators. Inside the test,
control the mock return with `vi.mocked(fn).mockReturnValueOnce(...)`.
See `lib/middleware/__tests__/csrf-check.test.ts`.

### Database / Supabase tests

The service client is mocked with a chainable object that records each call
in `lib/services/__tests__/test-helpers.ts`. Service tests assert on the
recorded calls (e.g. `.eq('tenant_id', ...)`) rather than mocking individual
Postgres responses.

### Component tests (React Testing Library)

Add `// @vitest-environment jsdom` as the first line of any `.test.tsx`
file. Import `render`, `screen`, and `userEvent` from
`@testing-library/react` / `@testing-library/user-event`.

```tsx
// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../MyComponent';

it('calls onClick when the button is pressed', async () => {
  const onClick = vi.fn();
  render(<MyComponent onClick={onClick} />);
  await userEvent.setup().click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

Reference tests:
- `app/components/media/video/__tests__/ChapterSidebar.test.tsx` — click
  handling, conditional rendering, active-state highlighting.
- `app/components/media/video/__tests__/EmbedPlayer.test.tsx` — URL
  transformations, sidebar layout variations, tab switching.
- `app/components/media/__tests__/VideoPlayer.routing.test.tsx` — mocks
  child components to test only the parent's routing logic.

#### jsdom gotchas

- **`scrollIntoView` is not implemented** — stub it before each test with
  `Element.prototype.scrollIntoView = vi.fn()` if your component uses it.
- **Import the component after `vi.mock()` calls** so the mocks take
  effect (see the routing test).
- **Use `@/` imports** — relative paths with spaces in the directory name
  can fail to resolve. The `@/` alias is set up in `vitest.config.ts`.

### Mocking `NODE_ENV`

Use `vi.stubEnv('NODE_ENV', 'production')` with `beforeEach` / `afterEach`
(and `vi.unstubAllEnvs()`) to restore between tests.

## What's NOT yet tested

- **API route handlers** — would benefit from [msw](https://mswjs.io) for
  fetch mocking. Service layer tests cover the business logic; route tests
  would verify the thin HTTP adapter.
- **Complex interactive components** — `SelfHostedPlayer`, `LessonViewer`,
  `DiscussionDetail`, `ProseForgeEditor`, `BrandingSettingsPage` — all
  still monolithic. Decomposing them with tests is Issue #3 follow-up work.
- **Most `lib/` domain modules** — crm, analytics, sonisweb, lti, etc.
  Coverage excludes them until they get their own tests.

## Writing new tests

1. Co-locate in the appropriate `__tests__/` folder.
2. Name files `*.test.ts` for pure logic, `*.test.tsx` for components.
3. For components, add `// @vitest-environment jsdom` at the top.
4. Keep tests focused — one assertion per `it()` is easier to debug.
5. Prefer behaviour assertions (`tenant_id gets injected`) over
   implementation checks (`Supabase was called X times`).
6. After adding tests, run `npm run test:coverage` and raise the
   thresholds in `vitest.config.ts` if the new numbers hold consistently.
