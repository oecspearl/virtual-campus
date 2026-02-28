import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveTenantFromHostname, getDefaultTenantId } from "@/lib/tenant";

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

  // Safety: never intercept API or static assets for auth (but tenant headers are already set)
  if (path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon') || path.startsWith('/icon') || path.startsWith('/apple-icon') || path === '/service-worker.js' || path === '/manifest.json' || path === '/site.webmanifest' || path.endsWith('.png')) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/about', '/auth/signin', '/auth/signup', '/test-supabase', '/auth-test', '/events', '/blog', '/contact', '/offline', '/apply', '/suspended'];
  const isPublicPath = publicPaths.includes(path) || path.startsWith('/auth/') || path.startsWith('/apply/') || path.startsWith('/admissions');

  // For public paths, allow access (tenant headers are already set)
  if (isPublicPath) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  try {
    // Check authentication using Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // If there's an error or no user, redirect to sign in
    if (error || !user) {
      console.log('Middleware: No user found, redirecting to signin');
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Check if user exists in our users table
    // Use service client to bypass RLS on users table (prevents infinite recursion)
    const { createServiceSupabaseClient } = await import('@/lib/supabase-server');
    const serviceSupabase = await createServiceSupabaseClient();
    let { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // If there's an error querying the profile or no profile exists, create one
    if (profileError || !userProfile) {
      console.log('Middleware: No user profile found, creating new user profile');

      // Create user in our database
      const newUser = {
        id: user.id,
        email: user.email || '',
        name: (user.user_metadata?.full_name || user.user_metadata?.name || '') as string,
        role: 'student', // Default role
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await serviceSupabase
        .from('users')
        .insert([newUser])
        .select('role')
        .single();

      if (createError) {
        console.error('Middleware: Failed to create user profile', createError);
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      // Create tenant membership for the new user
      await serviceSupabase
        .from('tenant_memberships')
        .insert([{
          tenant_id: tenantId,
          user_id: user.id,
          role: 'student',
          is_primary: true,
        }])
        .single();

      userProfile = createdUser;
      console.log('Middleware: User profile created successfully with tenant membership');
    }

    // Look up user's role within this specific tenant
    const { data: membership } = await serviceSupabase
      .from('tenant_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    // Add user info to headers for use in pages
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', userProfile.role);
    if (membership) {
      requestHeaders.set('x-user-tenant-role', membership.role);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.log('Middleware error:', error);
    // If there's any error, redirect to sign in
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
