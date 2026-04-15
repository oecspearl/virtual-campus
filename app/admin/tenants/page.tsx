"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  status: string;
  plan: string;
  max_users: number | null;
  member_count: number;
  created_at: string;
};

export default function TenantsPage() {
  return (
    <RoleGuard
      roles={["super_admin"]}
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm text-gray-600">Super admin access required.</p>
        </div>
      }
    >
      <TenantsInner />
    </RoleGuard>
  );
}

function TenantsInner() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", custom_domain: "", plan: "standard", max_users: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = await res.json();
      setTenants(data?.tenants || []);
    } catch {
      setError("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          custom_domain: form.custom_domain || undefined,
          plan: form.plan,
          max_users: form.max_users ? parseInt(form.max_users) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create tenant");
      } else {
        setForm({ name: "", slug: "", custom_domain: "", plan: "standard", max_users: "" });
        setShowCreate(false);
        load();
      }
    } catch {
      setError("Failed to create tenant");
    } finally {
      setCreating(false);
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-100 text-green-700";
      case "suspended": return "bg-red-100 text-red-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const planColor = (p: string) => {
    switch (p) {
      case "enterprise": return "bg-purple-100 text-purple-700";
      case "premium": return "bg-blue-100 text-blue-700";
      case "standard": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage institutions and organizations on the platform</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Tenant"}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {showCreate && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Create New Tenant</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Dominica State College"
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="e.g., dominica-state-college"
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Used in subdomain URL. Lowercase letters, numbers, hyphens only.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
              <input
                value={form.custom_domain}
                onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                placeholder="e.g., learn.dominica.edu"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
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
            <div className="flex items-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tenants found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-600">Members</th>
                <th className="px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${planColor(t.plan)}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.member_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--theme-primary)" }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
