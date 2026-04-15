import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse, type UserProfile } from './api-auth';
import { createTenantQuery, getTenantIdFromRequest } from './tenant-query';
import { hasRole, type UserRole } from './rbac';

/**
 * Context provided to route handlers by withTenantAuth.
 * Eliminates the 5-line auth+tenant boilerplate from every API route.
 */
export interface TenantAuthContext {
  /** The authenticated user's profile (id, email, name, role) */
  user: UserProfile;
  /** Tenant-scoped query builder — all DB operations auto-filtered by tenant_id */
  tq: ReturnType<typeof createTenantQuery>;
  /** The resolved tenant ID */
  tenantId: string;
  /** The original request */
  request: NextRequest;
}

type RouteHandler = (ctx: TenantAuthContext) => Promise<NextResponse>;

/**
 * Wraps an API route handler with authentication and tenant isolation.
 *
 * Before:
 * ```ts
 * export async function GET(request: Request) {
 *   const authResult = await authenticateUser(request as any);
 *   if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
 *   const user = authResult.userProfile!;
 *   const tenantId = getTenantIdFromRequest(request as any);
 *   const tq = createTenantQuery(tenantId);
 *   // ... handler logic
 * }
 * ```
 *
 * After:
 * ```ts
 * export const GET = withTenantAuth(async ({ user, tq }) => {
 *   // ... handler logic (auth + tenant already resolved)
 * });
 * ```
 *
 * @param handler - The route handler receiving an authenticated TenantAuthContext
 * @param options - Optional: requiredRoles to restrict access
 */
export function withTenantAuth(
  handler: RouteHandler,
  options?: { requiredRoles?: readonly UserRole[] },
) {
  return async (request: NextRequest, routeContext?: any): Promise<NextResponse> => {
    try {
      // Authenticate
      const authResult = await authenticateUser(request);
      if (!authResult.success) {
        return createAuthResponse(authResult.error!, authResult.status!);
      }
      const user = authResult.userProfile!;

      // Role check (if required)
      if (options?.requiredRoles && !hasRole(user.role, options.requiredRoles)) {
        return createAuthResponse('Forbidden', 403);
      }

      // Resolve tenant
      const tenantId = getTenantIdFromRequest(request, user.role);
      const tq = createTenantQuery(tenantId);

      return await handler({ user, tq, tenantId, request });
    } catch (error) {
      console.error('Route handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}
