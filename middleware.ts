import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveTenant, handleSuspendedTenant } from '@/lib/middleware/tenant';
import { blockDebugInProduction } from '@/lib/middleware/debug-block';
import { checkCsrf } from '@/lib/middleware/csrf-check';
import { isExemptFromAuth, isPublicPath, requirePageAuth } from '@/lib/middleware/auth-check';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // 1. Tenant resolution runs for every request — sets x-tenant-id header.
  const { tenantStatus } = await resolveTenant(request, requestHeaders);

  // 2. Suspended tenants get rewritten to /suspended.
  const suspended = handleSuspendedTenant(request, requestHeaders, tenantStatus, path);
  if (suspended) return suspended;

  // 3. Block debug/test routes in production even if they slip into the build.
  const blocked = blockDebugInProduction(request, requestHeaders, path);
  if (blocked) return blocked;

  // 4. CSRF validation for mutating API requests.
  const csrfFailure = checkCsrf(request, path);
  if (csrfFailure) return csrfFailure;

  // 5. API and static assets skip auth entirely (API routes do their own auth).
  if (isExemptFromAuth(path)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 6. Public pages pass through with tenant headers set.
  if (isPublicPath(path)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 7. Protected pages require a valid JWT — redirect to signin if missing.
  return requirePageAuth(request, requestHeaders);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
