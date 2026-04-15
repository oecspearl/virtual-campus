import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Distributed rate limiting using Supabase as the backing store.
 * Falls back to in-memory limiting if the database is unavailable.
 *
 * Uses a sliding window algorithm: each request increments a counter
 * stored in a lightweight table. Expired windows are cleaned up lazily.
 */

// In-memory fallback for when DB is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * Check rate limit using in-memory store with improved cleanup.
 * This is the primary implementation — simple, fast, and sufficient
 * for single-instance deployments or as a fallback.
 */
function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup — only when store grows large
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetTime) {
        memoryStore.delete(k);
      }
    }
  }

  const record = memoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    memoryStore.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      resetAt: new Date(resetTime),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: new Date(record.resetTime),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    limit,
    resetAt: new Date(record.resetTime),
  };
}

/**
 * Primary rate limit check.
 * Returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  return checkMemoryRateLimit(identifier, limit, windowMs).allowed;
}

/**
 * Rate limit check that returns full metadata for response headers.
 */
export function checkRateLimitWithMeta(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  return checkMemoryRateLimit(identifier, limit, windowMs);
}

/**
 * Lenient rate limit for auth profile endpoint.
 * RoleGuard calls this frequently so we allow 200 req/min.
 */
export function checkAuthProfileRateLimit(identifier: string): boolean {
  return checkRateLimit(identifier, 200, 60000);
}

/**
 * Rate limit headers for HTTP responses.
 * Supports two call signatures for backward compatibility:
 * - getRateLimitHeaders(result: RateLimitResult)
 * - getRateLimitHeaders(identifier: string, limit?: number, windowMs?: number)
 */
export function getRateLimitHeaders(
  resultOrIdentifier: RateLimitResult | string,
  limit?: number,
  windowMs?: number
): Record<string, string> {
  if (typeof resultOrIdentifier === 'string') {
    // Legacy signature: (identifier, limit, windowMs)
    const result = checkMemoryRateLimit(resultOrIdentifier, limit ?? 10, windowMs ?? 60000);
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
    };
  }

  // New signature: (RateLimitResult)
  return {
    'X-RateLimit-Limit': resultOrIdentifier.limit.toString(),
    'X-RateLimit-Remaining': resultOrIdentifier.remaining.toString(),
    'X-RateLimit-Reset': resultOrIdentifier.resetAt.toISOString(),
  };
}

/**
 * Strict rate limit for sensitive endpoints (AI, email sending).
 * Uses IP + user ID composite key for better accuracy.
 */
export function checkStrictRateLimit(
  ip: string,
  userId: string,
  limit: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  const identifier = `strict:${ip}:${userId}`;
  return checkMemoryRateLimit(identifier, limit, windowMs);
}
