import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Idempotency key support for critical mutation endpoints.
 *
 * Clients send an `Idempotency-Key` header with a unique value (e.g., UUID).
 * If a request with the same key was already processed, the cached response
 * is returned instead of executing the handler again.
 *
 * Uses in-memory cache with a 24-hour TTL. For multi-instance deployments,
 * this can be replaced with a Redis/KV-backed store.
 */

interface CachedResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  createdAt: number;
}

// In-memory store with 24-hour TTL
const idempotencyStore = new Map<string, CachedResponse>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanup() {
  const now = Date.now();
  if (idempotencyStore.size > 10000) {
    for (const [key, value] of idempotencyStore.entries()) {
      if (now - value.createdAt > TTL_MS) {
        idempotencyStore.delete(key);
      }
    }
  }
}

/**
 * Extract idempotency key from request.
 * Returns null if no key provided (non-idempotent request).
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return request.headers.get('idempotency-key');
}

/**
 * Check if we have a cached response for this idempotency key.
 * Returns the cached NextResponse if found, null otherwise.
 */
export function getCachedResponse(key: string): NextResponse | null {
  cleanup();

  const cached = idempotencyStore.get(key);
  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.createdAt > TTL_MS) {
    idempotencyStore.delete(key);
    return null;
  }

  const response = new NextResponse(cached.body, {
    status: cached.status,
    headers: {
      ...cached.headers,
      'X-Idempotency-Replay': 'true',
    },
  });

  return response;
}

/**
 * Cache a response for an idempotency key.
 */
export function cacheResponse(key: string, response: NextResponse): void {
  const cloned = response.clone();

  // Read the body and cache it
  cloned.text().then(body => {
    const headers: Record<string, string> = {};
    cloned.headers.forEach((value, name) => {
      headers[name] = value;
    });

    idempotencyStore.set(key, {
      status: cloned.status,
      body,
      headers,
      createdAt: Date.now(),
    });
  });
}

/**
 * Middleware wrapper for idempotent endpoints.
 * Wrap your mutation handler to automatically handle idempotency.
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withIdempotency(request, async () => {
 *     // Your handler logic here
 *     return NextResponse.json({ enrollment }, { status: 201 });
 *   });
 * }
 * ```
 */
export async function withIdempotency(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = getIdempotencyKey(request);

  // No idempotency key — execute normally
  if (!key) {
    return handler();
  }

  // Check for cached response
  const cached = getCachedResponse(key);
  if (cached) {
    return cached;
  }

  // Execute handler and cache the response
  const response = await handler();

  // Only cache successful responses (2xx)
  if (response.status >= 200 && response.status < 300) {
    cacheResponse(key, response);
  }

  return response;
}
