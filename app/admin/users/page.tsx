"use client";

import React from "react";
import RoleGuard from "@/app/components/RoleGuard";
import Button from "@/app/components/ui/Button";
import { ResponsiveTable } from "@/app/components/ui/ResponsiveTable";
import { ALL_ROLES, UserRole } from "@/lib/rbac";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  student_id?: string;
};

type EditDraft = { name: string; email: string; role: string };

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
  // One row is editable at a time. Keyed by user.id; null = view mode.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<EditDraft>({ name: '', email: '', role: 'student' });

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

  function startEdit(u: UserItem) {
    setEditingId(u.id);
    setDraft({ name: u.name, email: u.email, role: u.role });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(userId: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setEditingId(null);
    load();
  }

  async function removeUser(userId: string) {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    load();
  }

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

      <div className="mt-6">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading…</div>
        ) : (
          <ResponsiveTable<UserItem>
            caption="Users"
            rows={items}
            rowKey={(u) => u.id}
            empty="No users found"
            columns={[
              {
                key: 'name',
                header: 'Name',
                primary: true,
                render: (u) =>
                  editingId === u.id ? (
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      aria-label="Name"
                    />
                  ) : (
                    <span className="text-gray-900">{u.name}</span>
                  ),
              },
              {
                key: 'email',
                header: 'Email',
                render: (u) =>
                  editingId === u.id ? (
                    <input
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      aria-label="Email"
                    />
                  ) : (
                    <span className="text-gray-700 break-all">{u.email}</span>
                  ),
              },
              {
                key: 'student_id',
                header: 'Student ID',
                mobileLabel: 'Student ID',
                render: (u) => <span className="text-gray-500 text-xs">{u.student_id || '—'}</span>,
              },
              {
                key: 'role',
                header: 'Role',
                render: (u) =>
                  editingId === u.id ? (
                    <select
                      value={draft.role}
                      onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                      className="rounded-md border px-2 py-1 text-sm"
                      aria-label="Role"
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-700">{u.role}</span>
                  ),
              },
            ]}
            actions={(u) =>
              editingId === u.id ? (
                <>
                  <Button onClick={() => saveEdit(u.id)}><span>Save</span></Button>
                  <Button variant="outline" onClick={cancelEdit}><span>Cancel</span></Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => startEdit(u)}><span>Edit</span></Button>
                  <Button variant="outline" onClick={() => removeUser(u.id)}><span>Delete</span></Button>
                </>
              )
            }
          />
        )}
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

