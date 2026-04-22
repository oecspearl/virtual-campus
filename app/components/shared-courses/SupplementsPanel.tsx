'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

type Kind = 'announcement' | 'resource_link';

interface Supplement {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  body: string | null;
  url: string | null;
  link_type: string | null;
  icon: string | null;
  position: number;
  published: boolean;
  created_at: string;
  author: { id: string; name: string } | null;
}

interface Props {
  shareId: string;
  canEdit: boolean;
  canAddSupplementalContent: boolean;
  /** Initial supplements from the detail response — saves a roundtrip. */
  initial?: Supplement[];
}

const KIND_META: Record<Kind, { icon: string; label: string }> = {
  announcement: { icon: 'mdi:bullhorn-outline', label: 'Announcement' },
  resource_link: { icon: 'mdi:link-variant', label: 'Resource link' },
};

export default function SupplementsPanel({ shareId, canEdit, canAddSupplementalContent, initial }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>(initial || []);
  const [loading, setLoading] = useState(!initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const [form, setForm] = useState({
    kind: 'announcement' as Kind,
    title: '',
    description: '',
    body: '',
    url: '',
    published: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/supplements`);
      const data = await res.json();
      if (res.ok) setSupplements(data.supplements || []);
    } catch (e) {
      console.error('Supplements load error:', e);
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    if (!initial) load();
  }, [initial, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ kind: 'announcement', title: '', description: '', body: '', url: '', published: true });
    setShowForm(true);
  };

  const openEdit = (s: Supplement) => {
    setEditing(s);
    setForm({
      kind: s.kind,
      title: s.title,
      description: s.description || '',
      body: s.body || '',
      url: s.url || '',
      published: s.published,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    if (form.kind === 'announcement' && !form.body.trim()) {
      alert('Announcement body is required');
      return;
    }
    if (form.kind === 'resource_link' && !form.url.trim()) {
      alert('URL is required for resource links');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        kind: form.kind,
        title: form.title,
        description: form.description || undefined,
        published: form.published,
      };
      if (form.kind === 'announcement') payload.body = form.body;
      if (form.kind === 'resource_link') payload.url = form.url;

      const res = editing
        ? await fetch(`/api/shared-courses/${shareId}/supplements/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/shared-courses/${shareId}/supplements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save supplement');
        return;
      }
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: Supplement) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const res = await fetch(`/api/shared-courses/${shareId}/supplements/${s.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else alert('Failed to delete');
  };

  if (!canAddSupplementalContent && supplements.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Your institution&apos;s additions</h3>
          <p className="text-[11px] text-gray-500">Announcements and resources from your local instructors</p>
        </div>
        {canEdit && canAddSupplementalContent && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-blue-50/50 border-b border-blue-100">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white"
              disabled={!!editing}
            >
              <option value="announcement">Announcement</option>
              <option value="resource_link">Resource link</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
            />
          </div>
          {form.kind === 'announcement' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                required
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </div>
          )}
          {form.kind === 'resource_link' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL *</label>
                <input
                  required
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://…"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
                />
              </div>
            </>
          )}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-3.5 w-3.5"
            />
            Visible to your students
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editing ? 'Update' : 'Add supplement'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-4 h-20 animate-pulse bg-gray-50" />
        ) : supplements.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500">No supplements yet.</p>
            {canEdit && canAddSupplementalContent && (
              <p className="text-[11px] text-gray-400 mt-1">
                Add an announcement or resource link for your students.
              </p>
            )}
          </div>
        ) : (
          supplements.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-start gap-2">
                <Icon icon={KIND_META[s.kind].icon} className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    {canEdit && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-[11px] text-gray-500 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="text-[11px] text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {s.kind === 'announcement' && s.body && (
                    <p className="text-xs text-gray-600 whitespace-pre-wrap mt-1">{s.body}</p>
                  )}
                  {s.kind === 'resource_link' && (
                    <>
                      {s.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                      )}
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1"
                        >
                          {new URL(s.url).hostname}
                          <Icon icon="mdi:open-in-new" className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {s.author?.name || 'Unknown'}
                    {!s.published && <span className="ml-2 text-amber-600">· Hidden</span>}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
