"use client";

import React from "react";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";
import { ALL_ROLES, UserRole } from "@/lib/rbac";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  student_id?: string;
};

export default function AdminUsersPage() {
  return (
    <RoleGuard roles={["admin", "super_admin"]} fallback={<div className="mx-auto max-w-6xl px-4 py-8"><p className="text-sm text-gray-600">Admin access required.</p></div>}>
      <UsersInner />
    </RoleGuard>
  );
}

function UsersInner() {
  const [items, setItems] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<string>("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setItems((data?.users || []) as UserItem[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-900">User Management</h1>
        <Button
          onClick={() => window.location.href = '/admin/users/manage'}
          className="bg-oecs-lime-green hover:bg-oecs-lime-green-dark"
        >
          Advanced User Management
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm text-gray-900">Search & Filter</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 text-sm">
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="mt-2 flex gap-2">
            <Button onClick={load}><span>Apply</span></Button>
            <Button variant="outline" onClick={() => { setQ(""); setRole(""); }}><span>Reset</span></Button>
          </div>
        </div>
        <CreateUserCard onCreated={load} />
        <CsvImportCard onImported={load} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3" colSpan={5}><span className="text-gray-500">Loading…</span></td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-3" colSpan={5}><span className="text-gray-500">No users found</span></td></tr>
            ) : items.map((u) => (
              <UserRow key={u.id} user={u} onChanged={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("student");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, role }) });
    setSaving(false);
    setName(""); setEmail(""); setRole("student");
    onCreated();
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm text-gray-900">Create User</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
      <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="mt-2 w-full rounded-md border px-3 py-2 text-sm">
        {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <div className="mt-2"><Button onClick={submit} disabled={saving}><span>{saving ? 'Saving…' : 'Create'}</span></Button></div>
    </div>
  );
}

function CsvImportCard({ onImported }: { onImported: () => void }) {
  const [csv, setCsv] = React.useState("email,name,role\n");
  const [saving, setSaving] = React.useState(false);

  async function importCsv() {
    setSaving(true);
    await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) });
    setSaving(false);
    onImported();
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm text-gray-900">Bulk Import (CSV)</h2>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
      <div className="mt-2"><Button onClick={importCsv} disabled={saving}><span>{saving ? 'Importing…' : 'Import'}</span></Button></div>
      <p className="mt-2 text-xs text-gray-500">Header required: email,name,role</p>
    </div>
  );
}

function UserRow({ user, onChanged }: { user: UserItem; onChanged: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [role, setRole] = React.useState(user.role);

  async function save() {
    await fetch(`/api/admin/users/${user.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, role }) });
    setEditing(false);
    onChanged();
  }

  async function remove() {
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <tr>
      <td className="px-3 py-2 align-top">
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-2 py-1 text-sm" />
        ) : (
          <span className="text-gray-900">{user.name}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {editing ? (
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border px-2 py-1 text-sm" />
        ) : (
          <span className="text-gray-700">{user.email}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <span className="text-gray-500 text-xs">{user.student_id || '—'}</span>
      </td>
      <td className="px-3 py-2 align-top">
        {editing ? (
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border px-2 py-1 text-sm">
            {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className="text-gray-700">{user.role}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={save}><span>Save</span></Button>
            <Button variant="outline" onClick={() => setEditing(false)}><span>Cancel</span></Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}><span>Edit</span></Button>
            <Button variant="outline" onClick={remove}><span>Delete</span></Button>
          </div>
        )}
      </td>
    </tr>
  );
}
