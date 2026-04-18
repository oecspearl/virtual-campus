import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * In production, block access to debug and test endpoints/pages even if
 * they somehow slipped into the build. Returns a short-circuit response
 * when blocked, otherwise null.
 *
 * In development these paths pass through so developers can use them.
 */
export function blockDebugInProduction(
  request: NextRequest,
  requestHeaders: Headers,
  path: string
): NextResponse | null {
  if (process.env.NODE_ENV === 'development') return null;

  if (path.startsWith('/api/debug')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (
    path.startsWith('/test-') ||
    path.startsWith('/auth-test') ||
    path.startsWith('/admin/test')
  ) {
    return NextResponse.rewrite(new URL('/not-found', request.url), {
      request: { headers: requestHeaders },
    });
  }

  return null;
}
