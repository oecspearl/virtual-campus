/**
 * Shared Sentry options used by both server, edge, and client init.
 *
 * Sentry only initializes when SENTRY_DSN (server/edge) or
 * NEXT_PUBLIC_SENTRY_DSN (client) is set. That switch lives in Vercel
 * env config — DSN should only be set in the "Production" environment
 * so previews and local dev stay silent.
 */

/** Errors we don't want filling the quota. */
const IGNORED_ERROR_MESSAGES = [
  // Cancelled fetches from React strict mode or navigation aborts
  'AbortError',
  'The user aborted a request',
  'The operation was aborted',
  // Browser extensions injecting code into pages
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  // Hydration mismatches from third-party scripts
  'Hydration failed because the initial UI does not match',
  // Auth-flow expected errors (handled upstream)
  'Authentication required',
  'JWT expired',
] as const;

/** HTTP status codes that are expected and should not page anyone. */
const IGNORED_HTTP_STATUSES = new Set([401, 403, 404, 409, 429]);

/**
 * `beforeSend` runs on every event right before it's sent to Sentry.
 * Use it to drop known-noise events so they don't burn quota.
 */
export function shouldDropEvent(
  event: { message?: string; exception?: { values?: Array<{ type?: string; value?: string }> }; tags?: Record<string, unknown> },
): boolean {
  // Drop by HTTP status tag if one is attached.
  const statusTag = event.tags?.['http.status_code'];
  if (typeof statusTag === 'number' && IGNORED_HTTP_STATUSES.has(statusTag)) {
    return true;
  }

  // Drop by error message / type matching the ignore list.
  const message = event.message ?? '';
  const firstException = event.exception?.values?.[0];
  const exceptionValue = firstException?.value ?? '';
  const exceptionType = firstException?.type ?? '';
  const haystack = `${message} ${exceptionValue} ${exceptionType}`;

  for (const needle of IGNORED_ERROR_MESSAGES) {
    if (haystack.includes(needle)) return true;
  }

  return false;
}

/** Environment tag — Vercel sets VERCEL_ENV; we fall back to NODE_ENV locally. */
export function getEnvironmentName(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
}
