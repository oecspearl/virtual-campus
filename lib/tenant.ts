import { createServiceSupabaseClient } from './supabase-server';
import { getCachedTenant, getCachedTenantByDomain } from './tenant-cache';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string;
  settings: Record<string, any>;
  plan: string;
  max_users: number | null;
  created_at: string;
  updated_at: string;
}

export interface TenantContext {
  tenant: Tenant;
  userTenantRole: string | null;
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Extracts the subdomain from a hostname given the base domain.
 * e.g., "acme.virtualcampus.com" with base "virtualcampus.com" -> "acme"
 *       "localhost:3000" with base "localhost:3000" -> null
 *       "acme.localhost:3000" with base "localhost:3000" -> "acme"
 */
export function extractSubdomain(hostname: string): string | null {
  const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';

  // Exact match = no subdomain
  if (hostname === baseDomain) return null;

  // Check if hostname ends with .baseDomain
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1));
    // Ignore www
    if (subdomain === 'www') return null;
    return subdomain || null;
  }

  return null;
}

/**
 * Resolves a tenant from the request hostname.
 * Priority:
 *   1. Subdomain match (e.g., acme.virtualcampus.com -> slug "acme")
 *   2. Custom domain match (e.g., acme.edu -> custom_domain "acme.edu")
 *   3. Falls back to DEFAULT_TENANT_SLUG env var or "default"
 */
export async function resolveTenantFromHostname(
  hostname: string
): Promise<Tenant | null> {
  // 1. Try subdomain
  const subdomain = extractSubdomain(hostname);

  if (subdomain) {
    const tenant = await getCachedTenant(subdomain);
    if (tenant && tenant.status !== 'deactivated') return tenant;
  }

  // 2. Try custom domain (only if hostname doesn't match base domain pattern)
  if (!subdomain) {
    const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';
    const isBaseDomain = hostname === baseDomain || hostname === `www.${baseDomain}`;

    if (!isBaseDomain) {
      const tenant = await getCachedTenantByDomain(hostname);
      if (tenant && tenant.status !== 'deactivated') return tenant;
    }
  }

  // 3. Fall back to default tenant
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'default';
  return getCachedTenant(defaultSlug);
}

/**
 * Gets the user's role within a specific tenant.
 */
export async function getUserTenantRole(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const serviceSupabase = createServiceSupabaseClient();
  const { data } = await serviceSupabase
    .from('tenant_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single();
  return data?.role || null;
}

/**
 * Gets the default tenant ID constant.
 */
export function getDefaultTenantId(): string {
  return DEFAULT_TENANT_ID;
}
