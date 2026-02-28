"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import RoleGuard from "@/app/components/RoleGuard";

type TenantStat = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  member_count: number;
  course_count: number;
  enrollment_count: number;
};

type SystemStats = {
  total_tenants: number;
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  tenants: TenantStat[];
};

type SearchUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  tenant_memberships: {
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    role: string;
  }[];
};

export default function SystemDashboardPage() {
  return (
    <RoleGuard
      roles={["super_admin"]}
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm text-gray-600">Super admin access required.</p>
        </div>
      }
    >
      <DashboardInner />
    </RoleGuard>
  );
}

function DashboardInner() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
    } catch {
      setError("Failed to load system stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced user search
  useEffect(() => {
    if (userSearch.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await fetch(`/api/admin/system/users/search?q=${encodeURIComponent(userSearch.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setUserResults(data.users || []);
        }
      } catch {
        // ignore
      } finally {
        setUserSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  const handleToggleStatus = async (tenant: TenantStat) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    setTogglingStatus(tenant.id);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
      }
    } catch {
      // ignore
    } finally {
      setTogglingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-red-600">{error || "No data available"}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  const activeTenants = stats.tenants.filter((t) => t.status === "active").length;
  const suspendedTenants = stats.tenants.filter((t) => t.status === "suspended").length;

  // Filter tenants
  const filteredTenants = stats.tenants.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusTabs = [
    { key: "all", label: "All", count: stats.tenants.length },
    { key: "active", label: "Active", count: activeTenants },
    { key: "suspended", label: "Suspended", count: suspendedTenants },
    { key: "trial", label: "Trial", count: stats.tenants.filter((t) => t.status === "trial").length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Cross-tenant overview for super administrators</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Icon icon="material-symbols:refresh" className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/admin/tenants/create"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icon icon="material-symbols:add" className="w-4 h-4" />
            Create Tenant
          </Link>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Tenants" value={stats.total_tenants} icon="material-symbols:domain" color="emerald" />
        <StatCard label="Active" value={activeTenants} icon="material-symbols:check-circle" color="green" />
        <StatCard label="Suspended" value={suspendedTenants} icon="material-symbols:block" color="red" />
        <StatCard label="Total Users" value={stats.total_users} icon="material-symbols:group" color="blue" />
        <StatCard label="Total Courses" value={stats.total_courses} icon="material-symbols:book" color="purple" />
        <StatCard label="Total Enrollments" value={stats.total_enrollments} icon="material-symbols:school" color="orange" />
      </div>

      {/* Tenants Section */}
      <div className="rounded-xl border bg-white shadow-sm mb-8">
        <div className="px-4 py-3 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Tenants Overview</h2>
          <div className="relative w-full sm:w-64">
            <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="px-4 py-2 border-b flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Tenant</th>
                <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Members</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Courses</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Enrollments</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No tenants match your filters.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.slug}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{t.plan}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{t.member_count}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{t.course_count}</td>
                    <td className="px-4 py-3 text-gray-700 text-right">{t.enrollment_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(t)}
                          disabled={togglingStatus === t.id}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            t.status === "active"
                              ? "text-red-700 bg-red-50 hover:bg-red-100"
                              : "text-green-700 bg-green-50 hover:bg-green-100"
                          } ${togglingStatus === t.id ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {togglingStatus === t.id
                            ? "..."
                            : t.status === "active"
                            ? "Suspend"
                            : "Activate"}
                        </button>
                        <Link
                          href={`/admin/tenants/${t.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global User Search */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Global User Search</h2>
          <p className="text-xs text-gray-500 mt-0.5">Search users across all tenants by name or email</p>
        </div>
        <div className="p-4">
          <div className="relative max-w-md">
            <Icon icon="material-symbols:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email (min 2 chars)..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {userSearchLoading && (
            <div className="mt-4 text-sm text-gray-500">Searching...</div>
          )}

          {userResults.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">Name</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Email</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Role</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Tenant(s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userResults.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{u.name || "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                          {u.role?.replace(/_/g, " ") || "student"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {u.tenant_memberships.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.tenant_memberships.map((tm) => (
                              <span
                                key={tm.tenant_id}
                                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700"
                                title={`Role: ${tm.role}`}
                              >
                                {tm.tenant_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No membership</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {userSearch.trim().length >= 2 && !userSearchLoading && userResults.length === 0 && (
            <div className="mt-4 text-sm text-gray-500">No users found matching &quot;{userSearch}&quot;</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    orange: "bg-orange-50 border-orange-200",
  };
  const iconColorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
  };
  const textMap: Record<string, string> = {
    emerald: "text-emerald-700",
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${bgMap[color] || "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon icon={icon} className={`w-4 h-4 ${iconColorMap[color] || "text-gray-600"}`} />
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${textMap[color] || "text-gray-700"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    trial: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
