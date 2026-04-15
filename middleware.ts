import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveTenantFromHostname, getDefaultTenantId } from "@/lib/tenant";
import { validateCSRFToken } from "@/lib/security";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // ── Tenant resolution (runs for ALL routes including API/static) ──
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

  // If tenant is suspended, show suspension page (except for static assets)
  if (tenantStatus === 'suspended' && !path.startsWith('/_next') && !path.startsWith('/favicon') && !path.endsWith('.png') && path !== '/suspended') {
    return NextResponse.rewrite(new URL('/suspended', request.url), {
      request: { headers: requestHeaders },
    });
  }

  // Block debug/test endpoints in production
  if (process.env.NODE_ENV !== 'development') {
    if (path.startsWith('/api/debug')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (path.startsWith('/test-') || path.startsWith('/auth-test') || path.startsWith('/admin/test')) {
      return NextResponse.rewrite(new URL('/not-found', request.url), {
        request: { headers: requestHeaders },
      });
    }
  }

  // CSRF validation for mutating API requests (skip auth callbacks and cron routes)
  if (
    path.startsWith('/api') &&
    !path.startsWith('/api/auth') &&
    !path.startsWith('/api/cron') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    if (!validateCSRFToken(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  }

  // Safety: never intercept API or static assets for auth (but tenant headers are already set)
  if (path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon') || path.startsWith('/icon') || path.startsWith('/apple-icon') || path === '/service-worker.js' || path === '/manifest.json' || path === '/site.webmanifest' || path.endsWith('.png')) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/about', '/auth/signin', '/auth/signup', '/events', '/blog', '/contact', '/offline', '/apply', '/suspended'];
  const isPublicPath = publicPaths.includes(path) || path.startsWith('/auth/') || path.startsWith('/apply/') || path.startsWith('/admissions');

  // For public paths, allow access (tenant headers are already set)
  if (isPublicPath) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  try {
    // Check authentication using Supabase (JWT validation only — no DB queries)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // If there's an error or no user, redirect to sign in
    if (error || !user) {
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Set user ID header from the JWT (no DB needed)
    // User provisioning and role lookup happen in authenticateUser() on API calls,
    // and in getCurrentUser() on server component renders — not here.
    requestHeaders.set('x-user-id', user.id);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.log('Middleware error:', error);
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}

// Match ALL routes so tenant headers are set everywhere
// (auth/static skipping is handled inside the middleware function)
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
