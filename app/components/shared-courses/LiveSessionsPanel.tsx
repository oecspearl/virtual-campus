'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

type Provider = 'zoom' | 'teams' | 'meet' | 'jitsi' | 'other';
type Status = 'scheduled' | 'live' | 'completed' | 'cancelled';

interface Session {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  provider: Provider;
  status: Status;
  instructor: { id: string; name: string; email: string } | null;
}

interface Props {
  shareId: string;
  canEdit: boolean;
  canScheduleLiveSessions: boolean;
  /** Initial sessions from the detail endpoint — saves a roundtrip. */
  initial?: Session[];
}

const PROVIDER_LABELS: Record<Provider, string> = {
  zoom: 'Zoom',
  teams: 'Teams',
  meet: 'Google Meet',
  jitsi: 'Jitsi',
  other: 'Meeting',
};

function formatLocal(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function toDateTimeLocalInput(dt?: string) {
  if (!dt) return '';
  const d = new Date(dt);
  // yyyy-MM-ddTHH:mm in local time for the datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LiveSessionsPanel({ shareId, canEdit, canScheduleLiveSessions, initial }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initial || []);
  const [loading, setLoading] = useState(!initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_url: '',
    provider: 'other' as Provider,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/live-sessions`);
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch (e) {
      console.error('Live sessions load error:', e);
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    if (!initial) load();
  }, [initial, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      scheduled_at: '',
      duration_minutes: '60',
      meeting_url: '',
      provider: 'other',
    });
    setShowForm(true);
  };

  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description || '',
      scheduled_at: toDateTimeLocalInput(s.scheduled_at),
      duration_minutes: String(s.duration_minutes),
      meeting_url: s.meeting_url || '',
      provider: s.provider,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Title is required');
    if (!form.scheduled_at) return alert('Date and time are required');
    const d = Number(form.duration_minutes);
    if (!Number.isFinite(d) || d <= 0) return alert('Duration must be a positive number');

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: d,
        meeting_url: form.meeting_url || null,
        provider: form.provider,
      };
      const res = editing
        ? await fetch(`/api/shared-courses/${shareId}/live-sessions/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/shared-courses/${shareId}/live-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save session');
        return;
      }
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async (s: Session) => {
    if (!confirm(`Cancel "${s.title}"?`)) return;
    const res = await fetch(`/api/shared-courses/${shareId}/live-sessions/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (res.ok) load();
    else alert('Failed to cancel');
  };

  const handleDelete = async (s: Session) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const res = await fetch(`/api/shared-courses/${shareId}/live-sessions/${s.id}`, {
      method: 'DELETE',
    });
    if (res.ok) load();
    else alert('Failed to delete');
  };

  if (!canScheduleLiveSessions && sessions.length === 0) return null;

  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'live');

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:video-outline" className="w-4 h-4 text-orange-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Local live sessions</h3>
            <p className="text-[11px] text-gray-500">Scheduled by your institution for your cohort</p>
          </div>
        </div>
        {canEdit && canScheduleLiveSessions && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md"
          >
            <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
            Schedule
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-orange-50/50 border-b border-orange-100">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
              placeholder="e.g. Week 3 review session"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date &amp; time *</label>
              <input
                required
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (min) *</label>
              <input
                required
                type="number"
                min="1"
                max="600"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as Provider })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white"
              >
                <option value="zoom">Zoom</option>
                <option value="teams">Teams</option>
                <option value="meet">Google Meet</option>
                <option value="jitsi">Jitsi</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting URL</label>
              <input
                type="url"
                value={form.meeting_url}
                onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                placeholder="https://…"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
              />
            </div>
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
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editing ? 'Update' : 'Schedule'}
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
        ) : upcoming.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500">No upcoming sessions.</p>
            {canEdit && canScheduleLiveSessions && (
              <p className="text-[11px] text-gray-400 mt-1">Schedule a session for your cohort.</p>
            )}
          </div>
        ) : (
          upcoming.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-start gap-2">
                <Icon
                  icon={s.status === 'live' ? 'mdi:record-circle' : 'mdi:calendar-clock'}
                  className={`w-4 h-4 mt-0.5 shrink-0 ${s.status === 'live' ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}
                />
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
                          onClick={() => handleCancelSession(s)}
                          className="text-[11px] text-amber-600 hover:text-amber-700"
                        >
                          Cancel
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
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatLocal(s.scheduled_at)} · {s.duration_minutes} min · {PROVIDER_LABELS[s.provider]}
                    {s.status === 'live' && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200 rounded">
                        Live
                      </span>
                    )}
                  </p>
                  {s.description && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{s.description}</p>}
                  {s.meeting_url && (
                    <a
                      href={s.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-600 hover:underline inline-flex items-center gap-0.5 mt-1"
                    >
                      Join meeting
                      <Icon icon="mdi:open-in-new" className="w-3 h-3" />
                    </a>
                  )}
                  {s.instructor && (
                    <p className="text-[10px] text-gray-400 mt-1">Hosted by {s.instructor.name}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
