import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveTenantFromHostname, getDefaultTenantId } from '@/lib/tenant';

/**
 * Resolve tenant from hostname, set x-tenant-id and x-tenant-slug headers,
 * and return the resolved tenant status so callers can handle suspensions.
 *
 * Runs for ALL requests (including API and static) so downstream handlers
 * always have a tenant context available.
 */
export async function resolveTenant(
  request: NextRequest,
  requestHeaders: Headers
): Promise<{ tenantId: string; tenantSlug: string; tenantStatus: string }> {
  const hostname = request.headers.get('host') || 'localhost:3000';
  let tenantId = getDefaultTenantId();
  let tenantSlug = 'default';
  let tenantStatus = 'active';

  try {
    const tenant = await resolveTenantFromHostname(hostname);
    if (tenant) {
      tenantId = tenant.id;
      tenantSlug = tenant.slug;
      tenantStatus = tenant.status;
    }
  } catch (err) {
    console.error('Middleware: Tenant resolution failed, using default', err);
  }

  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  return { tenantId, tenantSlug, tenantStatus };
}

/**
 * If the tenant is suspended, rewrite the request to the /suspended page
 * (except for static assets which we let through so the page can render).
 * Returns a rewrite response when suspended, otherwise null.
 */
export function handleSuspendedTenant(
  request: NextRequest,
  requestHeaders: Headers,
  tenantStatus: string,
  path: string
): NextResponse | null {
  if (tenantStatus !== 'suspended') return null;
  const isStatic =
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.endsWith('.png') ||
    path === '/suspended';
  if (isStatic) return null;

  return NextResponse.rewrite(new URL('/suspended', request.url), {
    request: { headers: requestHeaders },
  });
}
