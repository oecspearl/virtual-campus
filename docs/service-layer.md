# Service Layer

The `lib/services/` directory holds domain-specific business logic extracted
from API routes. API routes become thin HTTP adapters; cron jobs, imports,
and internal tooling can call services directly.

## Why

Before extraction, business logic lived inline in ~250 API routes. This led to:

- **Duplication** — the same gradebook sync logic copied across quiz, assignment,
  and bulk import routes, each slightly different.
- **Uncallable from non-HTTP code** — cron jobs and scripts couldn't reuse the
  logic without duplicating it again.
- **Hard to test** — you had to stand up a full Next.js request to test a
  piece of business logic.

Service functions fix all three by being plain async functions with typed I/O.

## Pattern

```ts
// lib/services/<domain>-service.ts
import type { TenantQuery } from '@/lib/tenant-query';

export interface CreateFooInput { ... }
export interface CreateFooResult { id: string; /* ... */ }

export async function createFoo(
  tq: TenantQuery,
  input: CreateFooInput,
  creatorId: string
): Promise<CreateFooResult> {
  // 1. Validate (throw typed errors)
  // 2. Write primary row
  // 3. Run side effects (best effort)
  // 4. Return structured result
}

export class FooValidationError extends Error { /* ... */ }
```

### Route adapter

```ts
// app/api/foo/route.ts
export const POST = withTenantAuth(async ({ user, tq, request }) => {
  try {
    const input = await request.json();
    const result = await createFoo(tq, input, user.id);
    return NextResponse.json({ id: result.id });
  } catch (error) {
    if (error instanceof FooValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Create foo error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
});
```

## Conventions

1. **Always take `tq: TenantQuery` as the first parameter.** Tenant scoping is
   enforced by the caller; services never resolve their own tenant.
2. **Throw typed error classes for validation failures.** Routes catch specific
   types to map them to the right HTTP status (400 vs 500).
3. **Return structured results, not `NextResponse`.** Services are transport-
   agnostic — no `NextResponse`, no `Request`, no `Headers` in the return type.
4. **Side effects are best-effort by default.** Log failures, return booleans
   in the result, and don't fail the primary operation. Use transactions
   when atomicity is genuinely required.
5. **Keep services small and focused.** One function per use case. Split long
   flows into private helpers within the service file.

## What's extracted

| Service | What it does | Route(s) using it |
|---------|-------------|-------------------|
| `enrollment-service.ts` | List student enrollments (self or all) | `app/api/enrollments/route.ts` |
| `quiz-service.ts` | Create quiz + append to lesson content + sync gradebook | `app/api/quizzes/route.ts` |
| `assignment-service.ts` | Create assignment + append to lesson content + sync gradebook | `app/api/assignments/route.ts` |
| `gradebook-service.ts` | Shared: idempotent `course_grade_items` creation for any assessment | quiz-service, assignment-service |
| `lesson-content-helpers.ts` | Shared: atomic append-to-lesson-content (RPC + fallback) | quiz-service, assignment-service |

## Shared helpers

When two domain services need the same sub-operation, extract it into a
shared helper rather than duplicating it. Examples above: both quiz and
assignment creation need to append a content block to a lesson and sync
to the gradebook, so those live in shared modules and get tested once.

## What's NOT yet extracted

Top candidates for future extraction (from the Horizon 3 roadmap):

- **course-service** — course CRUD, cascade delete, cloning (Issue #8 territory)
- **discussion-service** — discussion CRUD, reply trees, voting
- **notification-service** — omnichannel send logic
- **user-service** — user creation/invite, tenant membership, password reset

When extracting a new domain:
1. Read the source route(s) for the domain.
2. Identify the core operations and their side effects.
3. Write the service with the conventions above.
4. Refactor the route to call the service.
5. Add tests — aim for 80%+ line coverage on the service.
6. Update this table.
