import { createServiceSupabaseClient } from './supabase-server';
import { getRedis } from './redis';
import type { Tenant } from './tenant';

/**
 * Two-tier tenant cache:
 *   L1 — per-instance in-memory map (5s TTL). Absorbs the high-frequency
 *        middleware hits without hammering Redis.
 *   L2 — Upstash Redis (5min TTL). Shared across all Vercel instances so
 *        a tenant update from one instance is visible to the others
 *        within a few seconds (after L1 expires).
 *
 * Invalidations write through to both L1 and L2.
 */

const L1_TTL_MS = 5_000;
const L2_TTL_SEC = 300;

interface L1Entry {
  tenant: Tenant;
  expiresAt: number;
}

const slugL1 = new Map<string, L1Entry>();
const domainL1 = new Map<string, L1Entry>();

const slugKey = (slug: string) => `tenant:slug:${slug}`;
const domainKey = (domain: string) => `tenant:domain:${domain}`;

async function fetchAndCache(
  predicate: { column: 'slug' | 'custom_domain'; value: string },
): Promise<Tenant | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('tenants')
    .select('*')
    .eq(predicate.column, predicate.value)
    .single();

  if (!data) return null;
  const tenant = data as Tenant;
  setCaches(tenant);
  return tenant;
}

function setCaches(tenant: Tenant) {
  const expiresAt = Date.now() + L1_TTL_MS;
  slugL1.set(tenant.slug, { tenant, expiresAt });
  if (tenant.custom_domain) {
    domainL1.set(tenant.custom_domain, { tenant, expiresAt });
  }
  const redis = getRedis();
  if (redis) {
    // Fire and forget — L1 already serves this request.
    redis.set(slugKey(tenant.slug), tenant, { ex: L2_TTL_SEC }).catch(() => {});
    if (tenant.custom_domain) {
      redis.set(domainKey(tenant.custom_domain), tenant, { ex: L2_TTL_SEC }).catch(() => {});
    }
  }
}

async function readL2BySlug(slug: string): Promise<Tenant | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const v = await redis.get<Tenant>(slugKey(slug));
    return v ?? null;
  } catch {
    return null;
  }
}

async function readL2ByDomain(domain: string): Promise<Tenant | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const v = await redis.get<Tenant>(domainKey(domain));
    return v ?? null;
  } catch {
    return null;
  }
}

export async function getCachedTenant(slug: string): Promise<Tenant | null> {
  const now = Date.now();
  const l1 = slugL1.get(slug);
  if (l1 && l1.expiresAt > now) return l1.tenant;

  const l2 = await readL2BySlug(slug);
  if (l2) {
    slugL1.set(slug, { tenant: l2, expiresAt: now + L1_TTL_MS });
    if (l2.custom_domain) {
      domainL1.set(l2.custom_domain, { tenant: l2, expiresAt: now + L1_TTL_MS });
    }
    return l2;
  }

  return fetchAndCache({ column: 'slug', value: slug });
}

export async function getCachedTenantByDomain(domain: string): Promise<Tenant | null> {
  const now = Date.now();
  const l1 = domainL1.get(domain);
  if (l1 && l1.expiresAt > now) return l1.tenant;

  const l2 = await readL2ByDomain(domain);
  if (l2) {
    domainL1.set(domain, { tenant: l2, expiresAt: now + L1_TTL_MS });
    slugL1.set(l2.slug, { tenant: l2, expiresAt: now + L1_TTL_MS });
    return l2;
  }

  return fetchAndCache({ column: 'custom_domain', value: domain });
}

/**
 * Invalidates cache for a specific tenant slug across all instances.
 * Call after tenant updates from admin routes.
 */
export async function invalidateTenantCache(slug: string): Promise<void> {
  const l1 = slugL1.get(slug);
  const customDomain = l1?.tenant.custom_domain;
  slugL1.delete(slug);
  if (customDomain) domainL1.delete(customDomain);

  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(slugKey(slug));
    if (customDomain) await redis.del(domainKey(customDomain));
  } catch (err) {
    console.warn('[tenant-cache] Redis del failed:', err);
  }
}

/**
 * Invalidates all cached tenants on this instance (L1) and best-effort L2.
 * Note: clearing all L2 keys requires a SCAN; we leave them to expire naturally.
 */
export function invalidateAllTenantCaches(): void {
  slugL1.clear();
  domainL1.clear();
}
