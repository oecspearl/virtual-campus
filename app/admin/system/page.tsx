"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-gray-500">Loading system dashboard...</div>;
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-red-600">{error || "No data available"}</p>
      </div>
    );
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-100 text-green-700";
      case "suspended": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900">System Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-tenant overview for super administrators</p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tenants" value={stats.total_tenants} color="emerald" />
        <StatCard label="Total Users" value={stats.total_users} color="blue" />
        <StatCard label="Total Courses" value={stats.total_courses} color="purple" />
        <StatCard label="Total Enrollments" value={stats.total_enrollments} color="orange" />
      </div>

      {/* Per-tenant breakdown */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Tenants Overview</h2>
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
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{t.plan}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{t.member_count}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{t.course_count}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{t.enrollment_count}</td>
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
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    orange: "bg-orange-50 border-orange-200",
  };
  const textMap: Record<string, string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${bgMap[color] || "bg-gray-50 border-gray-200"}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textMap[color] || "text-gray-700"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
