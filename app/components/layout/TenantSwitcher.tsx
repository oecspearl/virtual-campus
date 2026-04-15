"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useTenantSwitcher } from "@/lib/hooks/useTenantSwitcher";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function TenantSwitcher() {
  const { selectedTenantId, selectedTenantName, isOverrideActive, setTenantOverride, clearOverride } = useTenantSwitcher();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch tenants when dropdown opens
  useEffect(() => {
    if (!open || tenants.length > 0) return;
    setLoading(true);
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => {
        setTenants(data.tenants || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, tenants.length]);

  const handleSelect = (tenant: TenantOption) => {
    setTenantOverride(tenant.id, tenant.name);
    setOpen(false);
    // Reload to apply tenant context
    window.location.reload();
  };

  const handleReset = () => {
    clearOverride();
    setOpen(false);
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isOverrideActive
            ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <Icon icon="material-symbols:domain" className="w-4 h-4" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {isOverrideActive ? selectedTenantName : "All Tenants"}
        </span>
        <Icon icon="material-symbols:expand-more" className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg border border-gray-200/80 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Switch Tenant Context</p>
          </div>

          {isOverrideActive && (
            <button
              onClick={handleReset}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border-b transition-colors"
            >
              <Icon icon="material-symbols:undo" className="w-4 h-4" />
              Reset to Default View
            </button>
          )}

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">Loading tenants...</div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelect(tenant)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    selectedTenantId === tenant.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        tenant.status === "active" ? "bg-green-500" : tenant.status === "suspended" ? "bg-red-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="truncate">{tenant.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{tenant.slug}</span>
                  </div>
                  {selectedTenantId === tenant.id && (
                    <Icon icon="material-symbols:check" className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
