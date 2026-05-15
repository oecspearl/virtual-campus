import type { NextRequest, NextResponse } from 'next/server';

/**
 * Mint or pass through a stable per-request correlation ID.
 *
 * Order of precedence:
 *   1. `x-request-id` from the client (e.g. supplied by a frontend
 *      retry layer to tie retries together).
 *   2. `x-vercel-id` (Vercel-injected; Vercel's own log lines use it).
 *   3. A newly-generated UUID.
 *
 * The ID is written back onto `requestHeaders` so downstream route
 * handlers and the structured logger see the same value. Call
 * `attachRequestIdHeader(response, id)` on the outbound response to
 * surface it to the client.
 */
export function ensureRequestId(request: NextRequest, requestHeaders: Headers): string {
  const existing =
    requestHeaders.get('x-request-id') ||
    requestHeaders.get('x-vercel-id') ||
    request.headers.get('x-request-id') ||
    request.headers.get('x-vercel-id');

  const id = existing && existing.trim() ? existing.trim() : generateId();
  requestHeaders.set('x-request-id', id);
  return id;
}

export function attachRequestIdHeader(response: NextResponse, id: string): NextResponse {
  response.headers.set('X-Request-Id', id);
  return response;
}

function generateId(): string {
  // crypto.randomUUID is in the Edge / Node runtime since Node 14.17+ and
  // is available in Vercel Edge Functions. Fall back to a short random
  // string only if it's somehow missing.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
