"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";

type Member = {
  id: string;
  role: string;
  is_primary: boolean;
  created_at: string;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function TenantMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard
      roles={["super_admin", "tenant_admin"]}
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-sm text-gray-600">Admin access required.</p>
        </div>
      }
    >
      <MembersInner tenantId={id} />
    </RoleGuard>
  );
}

function MembersInner({ tenantId }: { tenantId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "student" });
  const [adding, setAdding] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [membersRes, tenantRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}/members`, { cache: "no-store" }),
        fetch(`/api/admin/tenants/${tenantId}`, { cache: "no-store" }),
      ]);
      if (membersRes.status === 403 || tenantRes.status === 403) {
        setForbidden(true);
        return;
      }
      const membersData = await membersRes.json();
      const tenantData = await tenantRes.json();
      setMembers(membersData?.members || []);
      setTenantName(tenantData?.tenant?.name || "");
    } catch {
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addForm.email, role: addForm.role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add member");
      } else {
        setSuccess(`Member added successfully`);
        setAddForm({ email: "", role: "student" });
        setShowAdd(false);
        load();
      }
    } catch {
      setError("Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from this tenant?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/members?user_id=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
      } else {
        setSuccess("Member removed");
        load();
      }
    } catch {
      setError("Failed to remove member");
    }
  }

  const roleColor = (r: string) => {
    switch (r) {
      case "super_admin": return "bg-red-100 text-red-700";
      case "tenant_admin": return "bg-orange-100 text-orange-700";
      case "admin": return "bg-purple-100 text-purple-700";
      case "instructor": return "bg-blue-100 text-blue-700";
      case "curriculum_designer": return "bg-teal-100 text-teal-700";
      case "student": return "bg-green-100 text-green-700";
      case "parent": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (forbidden) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">You do not have permission to access this tenant&apos;s members.</p>
          <Link href="/dashboard" className="text-sm mt-2 inline-block underline" style={{ color: "var(--theme-primary)" }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/admin/tenants/${tenantId}`} className="text-sm hover:underline" style={{ color: "var(--theme-primary)" }}>
          &larr; Back to {tenantName || "Tenant"}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">{tenantName} &mdash; {members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "Add Member"}
        </Button>
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

      {showAdd && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Add Member</h2>
          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="curriculum_designer">Curriculum Designer</option>
                <option value="admin">Admin</option>
                <option value="tenant_admin">Tenant Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No members found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tenant Role</th>
                <th className="px-4 py-3 font-medium text-gray-600">Global Role</th>
                <th className="px-4 py-3 font-medium text-gray-600">Primary</th>
                <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.users?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{m.users?.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleColor(m.role)}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleColor(m.users?.role)}`}>
                      {m.users?.role || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.is_primary ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(m.users?.id, m.users?.name || m.users?.email)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
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
