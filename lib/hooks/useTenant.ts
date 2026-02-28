'use client';

import { useState, useEffect, useCallback } from 'react';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: Record<string, any>;
  plan: string;
}

interface UseTenantReturn {
  tenant: TenantInfo | null;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedTenant: TenantInfo | null = null;
let cacheTimestamp = 0;

export function useTenant(): UseTenantReturn {
  const [tenant, setTenant] = useState<TenantInfo | null>(cachedTenant);
  const [loading, setLoading] = useState(!cachedTenant);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && cachedTenant && Date.now() - cacheTimestamp < CACHE_TTL) {
      setTenant(cachedTenant);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/tenant/current', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch tenant: ${res.status}`);
      }
      const data = await res.json();
      cachedTenant = data.tenant;
      cacheTimestamp = Date.now();
      setTenant(data.tenant);
      setError(null);
    } catch (err) {
      console.error('useTenant: Failed to fetch tenant info', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return {
    tenant,
    tenantId: tenant?.id || null,
    tenantSlug: tenant?.slug || null,
    tenantName: tenant?.name || null,
    loading,
    error,
    refetch: () => fetchTenant(true),
  };
}
