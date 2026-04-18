import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Paths that should skip authentication entirely:
 * - API routes (auth happens inside route handlers)
 * - Next.js internals and static assets
 * - Service worker and PWA manifests
 */
export function isExemptFromAuth(path: string): boolean {
  return (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/icon') ||
    path.startsWith('/apple-icon') ||
    path === '/service-worker.js' ||
    path === '/manifest.json' ||
    path === '/site.webmanifest' ||
    path.endsWith('.png')
  );
}

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/auth/signin',
  '/auth/signup',
  '/events',
  '/blog',
  '/contact',
  '/offline',
  '/apply',
  '/suspended',
];

/**
 * Whether a page path is publicly accessible without authentication.
 */
export function isPublicPath(path: string): boolean {
  return (
    PUBLIC_PATHS.includes(path) ||
    path.startsWith('/auth/') ||
    path.startsWith('/apply/') ||
    path.startsWith('/admissions')
  );
}

/**
 * For protected page routes, validate the JWT and attach x-user-id.
 * Redirects to /auth/signin on failure. Returns a response regardless —
 * either a redirect or a pass-through.
 *
 * User provisioning and role lookup happen later in authenticateUser() on
 * API calls, or in getCurrentUser() on server component renders. This step
 * only does a cheap JWT check.
 */
export async function requirePageAuth(
  request: NextRequest,
  requestHeaders: Headers
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    requestHeaders.set('x-user-id', user.id);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.log('Middleware auth error:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}
