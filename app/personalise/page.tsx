'use client';

import React from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';

interface CourseSummary {
  id: string;
  learner_goal: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  approved_at: string | null;
}

export default function PersonalisedCoursesListPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = React.useState(true);
  const [courses, setCourses] = React.useState<CourseSummary[]>([]);
  const [featureDisabled, setFeatureDisabled] = React.useState(false);
  const [editing, setEditing] = React.useState<CourseSummary | null>(null);
  const [deleting, setDeleting] = React.useState<CourseSummary | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch('/api/courses/personalise', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (res.status === 404) {
        setFeatureDisabled(true);
      } else if (res.ok) {
        const data = await res.json();
        setCourses(data.courses ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const saveEdits = async (id: string, fields: { learnerGoal: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    const res = await fetch(`/api/courses/personalise/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to save changes.');
    }
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, learner_goal: fields.learnerGoal } : c)),
    );
  };

  const removePath = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    const res = await fetch(`/api/courses/personalise/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to delete path.');
    }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading…</div>;
  }

  if (featureDisabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Personalised Paths</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build a custom course by picking lessons from across the catalogue.
          </p>
        </div>
        <Link href="/personalise/build">
          <Button>Build a new path</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
          You haven&apos;t built any personalised paths yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="group rounded-lg border bg-white p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/personalise/${c.id}`}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <p className="text-sm text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {c.learner_goal}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Started {new Date(c.created_at).toLocaleDateString()}
                    {c.approved_at && ` · Approved ${new Date(c.approved_at).toLocaleDateString()}`}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    aria-label="Edit path"
                    title="Edit path"
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L7.5 19.151l-4.5 1.5 1.5-4.5L16.862 4.487z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    aria-label="Delete path"
                    title="Delete path"
                    className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditGoalModal
          initialGoal={editing.learner_goal}
          onClose={() => setEditing(null)}
          onSave={async (learnerGoal) => {
            await saveEdits(editing.id, { learnerGoal });
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <DeletePathModal
          goal={deleting.learner_goal}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await removePath(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CourseSummary['status'] }) {
  const palette = {
    draft: 'bg-amber-50 text-amber-800 border-amber-200',
    active: 'bg-green-50 text-green-800 border-green-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200',
  }[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${palette}`}>
      {status}
    </span>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200/60"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditGoalModal({
  initialGoal,
  onClose,
  onSave,
}: {
  initialGoal: string;
  onClose: () => void;
  onSave: (goal: string) => Promise<void>;
}) {
  const [goal, setGoal] = React.useState(initialGoal);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const trimmed = goal.trim();
  const valid = trimmed.length >= 10 && trimmed.length <= 500;
  const dirty = trimmed !== initialGoal.trim();

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit path goal" onClose={onClose}>
      <div className="px-5 py-4 space-y-3">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
          Learning goal
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-between text-[11px]">
          <span className={valid ? 'text-gray-400' : 'text-red-600'}>
            10–500 characters
          </span>
          <span className="text-gray-400">{trimmed.length}/500</span>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 rounded-b-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !dirty || !valid}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </ModalShell>
  );
}

function DeletePathModal({
  goal,
  onClose,
  onConfirm,
}: {
  goal: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete path.');
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Delete path" onClose={onClose}>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-gray-700">
          Delete this path? This permanently removes the path and its sequence.
          This can&apos;t be undone.
        </p>
        <p className="text-xs text-gray-500 italic line-clamp-3">&ldquo;{goal}&rdquo;</p>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 rounded-b-lg">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Delete path'}
        </button>
      </div>
    </ModalShell>
  );
}
