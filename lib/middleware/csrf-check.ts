import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateCSRFToken } from '@/lib/security';

/**
 * Validate CSRF for mutating API requests. Auth callbacks and cron routes
 * are exempt because they legitimately cross origins (OAuth redirects,
 * Vercel cron invocations).
 *
 * Returns a 403 response when validation fails, otherwise null.
 */
export function checkCsrf(request: NextRequest, path: string): NextResponse | null {
  const isApi = path.startsWith('/api');
  const isAuthCallback = path.startsWith('/api/auth');
  const isCron = path.startsWith('/api/cron');
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  if (!isApi || isAuthCallback || isCron || !isMutating) return null;

  if (!validateCSRFToken(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  return null;
}
