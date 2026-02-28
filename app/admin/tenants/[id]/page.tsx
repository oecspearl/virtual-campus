"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/Button";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string;
  plan: string;
  max_users: number | null;
  member_count: number;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <TenantDetailInner tenantId={id} />
    </RoleGuard>
  );
}

function TenantDetailInner({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    custom_domain: "",
    status: "active",
    plan: "standard",
    max_users: "",
  });

  const [forbidden, setForbidden] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { cache: "no-store" });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const t = data.tenant;
      setTenant(t);
      setForm({
        name: t.name || "",
        slug: t.slug || "",
        custom_domain: t.custom_domain || "",
        status: t.status || "active",
        plan: t.plan || "standard",
        max_users: t.max_users?.toString() || "",
      });
    } catch {
      setError("Failed to load tenant");
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
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          custom_domain: form.custom_domain || null,
          status: form.status,
          plan: form.plan,
          max_users: form.max_users ? parseInt(form.max_users) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update tenant");
      } else {
        setSuccess("Tenant updated successfully");
        setTenant(data.tenant);
      }
    } catch {
      setError("Failed to update tenant");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone and will remove all associated data.")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete tenant");
      } else {
        router.push("/admin/tenants");
      }
    } catch {
      setError("Failed to delete tenant");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading tenant...</div>;
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">You do not have permission to access this tenant.</p>
          <Link href="/dashboard" className="text-sm mt-2 inline-block underline" style={{ color: "var(--theme-primary)" }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-red-600">Tenant not found</div>;
  }

  const isDefault = tenant.id === "00000000-0000-0000-0000-000000000001";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-sm hover:underline" style={{ color: "var(--theme-primary)" }}>
          &larr; Back to Tenants
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">{tenant.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/tenants/${tenantId}/members`}>
            <Button variant="outline">Members ({tenant.member_count})</Button>
          </Link>
          <Link href={`/admin/tenants/${tenantId}/settings`}>
            <Button variant="outline">Branding</Button>
          </Link>
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
        <h2 className="text-lg font-medium mb-4">Tenant Details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
              <input
                value={form.custom_domain}
                onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                placeholder="e.g., learn.school.edu"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input
                type="number"
                value={form.max_users}
                onChange={(e) => setForm({ ...form, max_users: e.target.value })}
                placeholder="Unlimited"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {!isDefault && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  {deleting ? "Deleting..." : "Delete Tenant"}
                </button>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-2">Tenant Info</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Tenant ID</dt>
          <dd className="font-mono text-xs text-gray-700">{tenant.id}</dd>
          <dt className="text-gray-500">Created</dt>
          <dd className="text-gray-700">{new Date(tenant.created_at).toLocaleString()}</dd>
          <dt className="text-gray-500">Updated</dt>
          <dd className="text-gray-700">{new Date(tenant.updated_at).toLocaleString()}</dd>
          <dt className="text-gray-500">Members</dt>
          <dd className="text-gray-700">{tenant.member_count}</dd>
        </dl>
      </div>
    </div>
  );
}
