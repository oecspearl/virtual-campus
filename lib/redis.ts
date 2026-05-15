import { Redis } from '@upstash/redis';

let cached: Redis | null = null;
let warned = false;

export function getRedis(): Redis | null {
  if (cached) return cached;
  // Accept either name set. UPSTASH_* is what `@upstash/redis` documents;
  // KV_REST_API_* is what the Vercel Marketplace integration injects (the
  // Vercel KV product is Upstash under the hood, so the REST endpoint is
  // identical — only the env-var names differ).
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn('[redis] No Upstash credentials (UPSTASH_REDIS_REST_URL or KV_REST_API_URL) — using in-memory fallbacks. This will not scale across instances.');
      warned = true;
    }
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}
