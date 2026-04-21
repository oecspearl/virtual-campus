"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";

type SettingEntry = {
  value: string;
  type: string;
  description: string | null;
};

const BRANDING_KEYS = [
  { key: "site_name", label: "Site Name", placeholder: "e.g., My Institution LMS" },
  { key: "site_short_name", label: "Short Name", placeholder: "e.g., MyLMS" },
  { key: "logo_url", label: "Logo URL", placeholder: "/logo.png or https://..." },
  { key: "logo_header_url", label: "Header Logo URL", placeholder: "/header-logo.png" },
  { key: "homepage_header_background", label: "Homepage Background", placeholder: "/background.png" },
  { key: "primary_color", label: "Primary Color", placeholder: "#2563eb" },
  { key: "secondary_color", label: "Secondary Color", placeholder: "#16a34a" },
  { key: "accent_color", label: "Accent Color", placeholder: "#f59e0b" },
  { key: "footer_text", label: "Footer Text", placeholder: "© 2024 My Institution" },
  { key: "support_email", label: "Support Email", placeholder: "support@school.edu" },
];

export default function TenantSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard
      roles={["super_admin", "tenant_admin"]}
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-sm text-gray-600">Admin access required.</p>
        </div>
      }
    >
      <SettingsInner tenantId={id} />
    </RoleGuard>
  );
}

type RegionalFlags = {
  regional_catalogue_publish_enabled: boolean;
  regional_catalogue_consume_enabled: boolean;
  credit_transfer_accept_enabled: boolean;
  credit_transfer_issue_enabled: boolean;
};

const REGIONAL_FLAG_KEYS: (keyof RegionalFlags)[] = [
  'regional_catalogue_publish_enabled',
  'regional_catalogue_consume_enabled',
  'credit_transfer_accept_enabled',
  'credit_transfer_issue_enabled',
];

function SettingsInner({ tenantId }: { tenantId: string }) {
  const [settings, setSettings] = useState<Record<string, SettingEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [forbidden, setForbidden] = useState(false);
  const [regionalFlags, setRegionalFlags] = useState<RegionalFlags>({
    regional_catalogue_publish_enabled: true,
    regional_catalogue_consume_enabled: true,
    credit_transfer_accept_enabled: true,
    credit_transfer_issue_enabled: true,
  });
  const [savingRegional, setSavingRegional] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, tenantRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}/settings`, { cache: "no-store" }),
        fetch(`/api/admin/tenants/${tenantId}`, { cache: "no-store" }),
      ]);
      if (settingsRes.status === 403 || tenantRes.status === 403) {
        setForbidden(true);
        return;
      }
      const settingsData = await settingsRes.json();
      const tenantData = await tenantRes.json();
      const s = settingsData?.settings || {};
      setSettings(s);
      setTenantName(tenantData?.tenant?.name || "");

      // Initialize regional flags from tenant row — default true if missing
      const t = tenantData?.tenant || {};
      setRegionalFlags({
        regional_catalogue_publish_enabled: t.regional_catalogue_publish_enabled !== false,
        regional_catalogue_consume_enabled: t.regional_catalogue_consume_enabled !== false,
        credit_transfer_accept_enabled: t.credit_transfer_accept_enabled !== false,
        credit_transfer_issue_enabled: t.credit_transfer_issue_enabled !== false,
      });

      // Initialize form from settings
      const formInit: Record<string, string> = {};
      BRANDING_KEYS.forEach((bk) => {
        formInit[bk.key] = s[bk.key]?.value || "";
      });
      setForm(formInit);
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const settingsPayload: Record<string, { value: string; type: string }> = {};
      BRANDING_KEYS.forEach((bk) => {
        if (form[bk.key] !== undefined) {
          settingsPayload[bk.key] = {
            value: form[bk.key],
            type: bk.key.includes("color") ? "color" : "text",
          };
        }
      });

      const res = await fetch(`/api/admin/tenants/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings");
      } else {
        setSuccess("Settings saved successfully");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRegional(partial: Partial<RegionalFlags>) {
    setSavingRegional(true);
    setError("");
    setSuccess("");
    const next = { ...regionalFlags, ...partial };
    setRegionalFlags(next);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save regional settings");
        // Revert on failure
        setRegionalFlags((prev) => ({ ...prev, ...regionalFlags }));
      } else {
        setSuccess("Regional settings saved");
      }
    } catch {
      setError("Failed to save regional settings");
      setRegionalFlags((prev) => ({ ...prev, ...regionalFlags }));
    } finally {
      setSavingRegional(false);
    }
  }

  // Compute extra settings not in BRANDING_KEYS
  const brandingKeySet = new Set(BRANDING_KEYS.map((bk) => bk.key));
  const extraSettings = Object.entries(settings).filter(([k]) => !brandingKeySet.has(k));

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading settings...</div>;
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">You do not have permission to access this tenant&apos;s settings.</p>
          <Link href="/dashboard" className="text-sm mt-2 inline-block underline" style={{ color: "var(--theme-primary)" }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/admin/tenants/${tenantId}`} className="text-sm hover:underline" style={{ color: "var(--theme-primary)" }}>
          &larr; Back to {tenantName || "Tenant"}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Branding & Settings</h1>
          <p className="text-sm text-gray-500 mt-1">{tenantName}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess("")} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Branding</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {BRANDING_KEYS.map((bk) => (
              <div key={bk.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{bk.label}</label>
                {bk.key.includes("color") ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form[bk.key] || "#000000"}
                      onChange={(e) => setForm({ ...form, [bk.key]: e.target.value })}
                      className="h-9 w-12 rounded border cursor-pointer"
                    />
                    <input
                      value={form[bk.key] || ""}
                      onChange={(e) => setForm({ ...form, [bk.key]: e.target.value })}
                      placeholder={bk.placeholder}
                      className="flex-1 rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                ) : (
                  <input
                    value={form[bk.key] || ""}
                    onChange={(e) => setForm({ ...form, [bk.key]: e.target.value })}
                    placeholder={bk.placeholder}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-1">Regional Collaboration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Control how this institution participates in the regional network.
          All flags default on.
        </p>
        <div className="space-y-3">
          <RegionalToggle
            label="Publish courses network-wide"
            description="Allow this institution's admins to share a course with every tenant (shares that target no specific tenant)."
            enabled={regionalFlags.regional_catalogue_publish_enabled}
            disabled={savingRegional}
            onChange={(v) => handleSaveRegional({ regional_catalogue_publish_enabled: v })}
          />
          <RegionalToggle
            label="Browse shared courses from other institutions"
            description="Let this institution's students see and enrol in courses shared by other tenants."
            enabled={regionalFlags.regional_catalogue_consume_enabled}
            disabled={savingRegional}
            onChange={(v) => handleSaveRegional({ regional_catalogue_consume_enabled: v })}
          />
          <RegionalToggle
            label="Accept incoming credit transfers"
            description="Let this institution's students submit credits for review by this institution's registrar."
            enabled={regionalFlags.credit_transfer_accept_enabled}
            disabled={savingRegional}
            onChange={(v) => handleSaveRegional({ credit_transfer_accept_enabled: v })}
          />
          <RegionalToggle
            label="Allow this institution to be cited as an issuer"
            description="Let students at other tenants cite this institution as the issuing institution on their credit submissions."
            enabled={regionalFlags.credit_transfer_issue_enabled}
            disabled={savingRegional}
            onChange={(v) => handleSaveRegional({ credit_transfer_issue_enabled: v })}
          />
        </div>
      </div>

      {extraSettings.length > 0 && (
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Other Settings</h2>
          <div className="space-y-2">
            {extraSettings.map(([key, entry]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700">{key}</span>
                  {entry.description && (
                    <p className="text-xs text-gray-400">{entry.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-600 font-mono">{entry.value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegionalToggle({
  label,
  description,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-blue-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
