"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tenant_override";

interface TenantOverride {
  tenantId: string;
  tenantName: string;
}

export function useTenantSwitcher() {
  const [override, setOverrideState] = useState<TenantOverride | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOverrideState(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const setTenantOverride = useCallback((tenantId: string, tenantName: string) => {
    const value = { tenantId, tenantName };
    setOverrideState(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    // Dispatch event so other components can react
    window.dispatchEvent(new Event("tenant-override-changed"));
  }, []);

  const clearOverride = useCallback(() => {
    setOverrideState(null);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("tenant-override-changed"));
  }, []);

  // Listen for changes from other components
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setOverrideState(stored ? JSON.parse(stored) : null);
      } catch {
        setOverrideState(null);
      }
    };
    window.addEventListener("tenant-override-changed", handler);
    return () => window.removeEventListener("tenant-override-changed", handler);
  }, []);

  return {
    selectedTenantId: override?.tenantId || null,
    selectedTenantName: override?.tenantName || null,
    isOverrideActive: !!override,
    setTenantOverride,
    clearOverride,
  };
}

/**
 * Fetch wrapper that adds x-tenant-override header when a tenant override is active.
 * Use this instead of raw fetch() in admin pages that should respect tenant switching.
 */
export function tenantFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { tenantId } = JSON.parse(stored) as TenantOverride;
      const headers = new Headers(options.headers);
      headers.set("x-tenant-override", tenantId);
      return fetch(url, { ...options, headers });
    }
  } catch {
    // Ignore errors, fall through to normal fetch
  }
  return fetch(url, options);
}
