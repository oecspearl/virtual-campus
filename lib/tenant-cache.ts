import { createServiceSupabaseClient } from './supabase-server';
import type { Tenant } from './tenant';

const CACHE_TTL = 300_000; // 5 minutes

interface CacheEntry {
  tenant: Tenant;
  expiresAt: number;
}

// Keyed by slug
const slugCache = new Map<string, CacheEntry>();
// Keyed by custom_domain
const domainCache = new Map<string, CacheEntry>();

/**
 * Fetches and caches a tenant by slug.
 */
export async function getCachedTenant(slug: string): Promise<Tenant | null> {
  const now = Date.now();
  const cached = slugCache.get(slug);
  if (cached && cached.expiresAt > now) return cached.tenant;

  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (data) {
    const entry: CacheEntry = { tenant: data as Tenant, expiresAt: now + CACHE_TTL };
    slugCache.set(slug, entry);
    if (data.custom_domain) {
      domainCache.set(data.custom_domain, entry);
    }
  }

  return (data as Tenant) || null;
}

/**
 * Fetches and caches a tenant by custom domain.
 */
export async function getCachedTenantByDomain(domain: string): Promise<Tenant | null> {
  const now = Date.now();
  const cached = domainCache.get(domain);
  if (cached && cached.expiresAt > now) return cached.tenant;

  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('tenants')
    .select('*')
    .eq('custom_domain', domain)
    .single();

  if (data) {
    const entry: CacheEntry = { tenant: data as Tenant, expiresAt: now + CACHE_TTL };
    domainCache.set(domain, entry);
    slugCache.set(data.slug, entry);
  }

  return (data as Tenant) || null;
}

/**
 * Invalidates cache for a specific tenant slug.
 * Call after tenant updates from admin routes.
 */
export function invalidateTenantCache(slug: string): void {
  const cached = slugCache.get(slug);
  if (cached?.tenant.custom_domain) {
    domainCache.delete(cached.tenant.custom_domain);
  }
  slugCache.delete(slug);
}

/**
 * Invalidates all cached tenants.
 */
export function invalidateAllTenantCaches(): void {
  slugCache.clear();
  domainCache.clear();
}
