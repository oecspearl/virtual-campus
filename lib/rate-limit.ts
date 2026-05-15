import { getRedis } from './redis';

/**
 * Distributed rate limiting backed by Upstash Redis.
 *
 * Each identifier maps to a key `rl:{identifier}` storing a counter that
 * expires when the window ends. Increment is atomic via INCR; on the first
 * hit we also set EXPIRE so the window slides correctly.
 *
 * If Redis is not configured, falls back to an in-memory map (single-instance
 * only — fine for local dev, not safe for production at scale).
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

// --- In-memory fallback (per-instance) ---
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetTime) memoryStore.delete(k);
    }
  }

  const record = memoryStore.get(identifier);
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    memoryStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, limit, resetAt: new Date(resetTime) };
  }
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt: new Date(record.resetTime) };
  }
  record.count++;
  return { allowed: true, remaining: limit - record.count, limit, resetAt: new Date(record.resetTime) };
}

// --- Redis-backed primary path ---
async function checkRedisRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return checkMemoryRateLimit(identifier, limit, windowMs);

  const key = `rl:${identifier}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }
    // Best-effort TTL fetch for the reset header; if it's -1 (no TTL), set one.
    let ttl = await redis.ttl(key);
    if (ttl < 0) {
      await redis.expire(key, windowSec);
      ttl = windowSec;
    }
    const resetAt = new Date(Date.now() + ttl * 1000);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt,
    };
  } catch (err) {
    console.warn('[rate-limit] Redis check failed, falling back to memory:', err);
    return checkMemoryRateLimit(identifier, limit, windowMs);
  }
}

// --- Public async API ---

/** Returns true if the request is allowed. */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000
): Promise<boolean> {
  const result = await checkRedisRateLimit(identifier, limit, windowMs);
  return result.allowed;
}

/** Full metadata for HTTP response headers. */
export async function checkRateLimitWithMeta(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  return checkRedisRateLimit(identifier, limit, windowMs);
}

/** Lenient limit for the auth profile endpoint (RoleGuard polls it). */
export async function checkAuthProfileRateLimit(identifier: string): Promise<boolean> {
  return checkRateLimit(identifier, 200, 60_000);
}

/** Strict limit for sensitive endpoints (AI, email). Composite key (ip+user). */
export async function checkStrictRateLimit(
  ip: string,
  userId: string,
  limit: number = 5,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  return checkRedisRateLimit(`strict:${ip}:${userId}`, limit, windowMs);
}

/**
 * Format an X-RateLimit-* header block from a RateLimitResult.
 * The legacy `(identifier, limit, windowMs)` signature was removed — it
 * silently double-counted the request (one for the check, one for the
 * header), so callers should pass a RateLimitResult instead.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}
