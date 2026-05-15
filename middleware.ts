import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveTenant, handleSuspendedTenant } from '@/lib/middleware/tenant';
import { blockDebugInProduction } from '@/lib/middleware/debug-block';
import { checkCsrf } from '@/lib/middleware/csrf-check';
import { isExemptFromAuth, isPublicPath, requirePageAuth } from '@/lib/middleware/auth-check';
import { ensureRequestId, attachRequestIdHeader } from '@/lib/middleware/request-id';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // 0. Mint (or pass through) a per-request correlation ID. This goes on
  //    the inbound headers so the logger and route handlers see the same
  //    value, and on the outbound response so support tickets can quote it.
  const requestId = ensureRequestId(request, requestHeaders);

  // 1. Tenant resolution runs for every request — sets x-tenant-id header.
  const { tenantStatus } = await resolveTenant(request, requestHeaders);

  // 2. Suspended tenants get rewritten to /suspended.
  const suspended = handleSuspendedTenant(request, requestHeaders, tenantStatus, path);
  if (suspended) return attachRequestIdHeader(suspended, requestId);

  // 3. Block debug/test routes in production even if they slip into the build.
  const blocked = blockDebugInProduction(request, requestHeaders, path);
  if (blocked) return attachRequestIdHeader(blocked, requestId);

  // 4. CSRF validation for mutating API requests.
  const csrfFailure = checkCsrf(request, path);
  if (csrfFailure) return attachRequestIdHeader(csrfFailure, requestId);

  // 5. API and static assets skip auth entirely (API routes do their own auth).
  if (isExemptFromAuth(path)) {
    return attachRequestIdHeader(
      NextResponse.next({ request: { headers: requestHeaders } }),
      requestId,
    );
  }

  // 6. Public pages pass through with tenant headers set.
  if (isPublicPath(path)) {
    return attachRequestIdHeader(
      NextResponse.next({ request: { headers: requestHeaders } }),
      requestId,
    );
  }

  // 7. Protected pages require a valid JWT — redirect to signin if missing.
  return attachRequestIdHeader(await requirePageAuth(request, requestHeaders), requestId);
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
