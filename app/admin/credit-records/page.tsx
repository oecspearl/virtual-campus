'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import RoleGuard from '@/app/components/RoleGuard';
import AccessibleModal from '@/app/components/ui/AccessibleModal';
import CommentThread from '@/app/components/credit-records/CommentThread';

interface RegistrarRecord {
  id: string;
  source_type: 'in_network' | 'external';
  issuing_institution_name: string;
  issuing_tenant: { id: string; name: string; slug: string } | null;
  course_title: string;
  course_code: string | null;
  credits: number;
  awarded_credits: number | null;
  grade: string | null;
  grade_scale: string | null;
  completion_date: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  evidence_url: string | null;
  equivalence_notes: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  student: { id: string; name: string; email: string } | null;
  equivalent_course: { id: string; title: string } | null;
  reviewer: { id: string; name: string } | null;
  comment_count: number;
  last_comment_by_student: boolean;
  last_comment_at: string | null;
}

interface Course {
  id: string;
  title: string;
  published: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-50 text-gray-600 border-gray-200',
};

const TABS = [
  { key: 'open', label: 'Queue' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminCreditRecordsPage() {
  const [records, setRecords] = useState<RegistrarRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RegistrarRecord | null>(null);
  const [mode, setMode] = useState<'view' | 'approve' | 'reject' | null>(null);
  const [awarded, setAwarded] = useState('');
  const [equivalentCourseId, setEquivalentCourseId] = useState('');
  const [equivalenceNotes, setEquivalenceNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/credit-records?status=${tab}`);
      const data = await res.json();
      setRecords(data.records || []);
      setCounts(data.counts || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourses((d.courses || []).filter((c: Course) => c.published)))
      .catch(() => {});
  }, []);

  const openApprove = (r: RegistrarRecord) => {
    setSelected(r);
    setMode('approve');
    setAwarded(String(r.credits));
    setEquivalentCourseId('');
    setEquivalenceNotes('');
    setReviewNotes('');
  };

  const openReject = (r: RegistrarRecord) => {
    setSelected(r);
    setMode('reject');
    setReviewNotes('');
  };

  const openView = (r: RegistrarRecord) => {
    setSelected(r);
    setMode('view');
  };

  const closeModal = () => {
    setSelected(null);
    setMode(null);
  };

  const handleStartReview = async (id: string) => {
    await fetch(`/api/admin/credit-records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_review' }),
    });
    load();
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/credit-records/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          awarded_credits: awarded ? Number(awarded) : undefined,
          equivalent_course_id: equivalentCourseId || undefined,
          equivalence_notes: equivalenceNotes || undefined,
          review_notes: reviewNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to approve');
        return;
      }
      closeModal();
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!reviewNotes.trim()) {
      alert('Rejection reason is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/credit-records/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', review_notes: reviewNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to reject');
        return;
      }
      closeModal();
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard roles={['admin', 'super_admin', 'tenant_admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-1">Credit Transfer Review</h1>
            <p className="text-sm text-gray-600">
              Review credits submitted by students from other institutions
            </p>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <CountCard label="Pending" value={counts.pending || 0} color="amber" />
            <CountCard label="Under review" value={counts.under_review || 0} color="blue" />
            <CountCard label="Approved" value={counts.approved || 0} color="green" />
            <CountCard label="Rejected" value={counts.rejected || 0} color="red" />
            <CountCard label="Withdrawn" value={counts.withdrawn || 0} color="gray" />
          </div>

          {/* Tabs + search */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-gray-200 mb-6 gap-3">
            <div className="flex">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-72 pb-2 sm:pb-0">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, course, institution"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {(() => {
          const q = search.trim().toLowerCase();
          const filtered = q
            ? records.filter((r) => {
                const haystack = [
                  r.student?.name,
                  r.student?.email,
                  r.course_title,
                  r.course_code,
                  r.issuing_institution_name,
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                return haystack.includes(q);
              })
            : records;
          return loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 h-40 animate-pulse" />
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Icon icon="mdi:inbox-outline" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
                {q ? `No records match "${search}"` : 'No records in this view'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Institution</th>
                    <th className="px-4 py-3 font-medium">Credits</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.student?.name}</p>
                        <p className="text-xs text-gray-500">{r.student?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{r.course_title}</p>
                        {r.course_code && <p className="text-xs text-gray-500">{r.course_code}</p>}
                        {r.comment_count > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 mt-1 text-xs px-1.5 py-0.5 rounded-full border ${
                              r.last_comment_by_student && !['approved', 'rejected', 'withdrawn'].includes(r.status)
                                ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                            title={
                              r.last_comment_by_student && !['approved', 'rejected', 'withdrawn'].includes(r.status)
                                ? 'Awaiting your response'
                                : `${r.comment_count} note${r.comment_count === 1 ? '' : 's'}`
                            }
                          >
                            <Icon icon="mdi:forum-outline" className="w-3 h-3" />
                            {r.comment_count}
                            {r.last_comment_by_student && !['approved', 'rejected', 'withdrawn'].includes(r.status) && (
                              <span className="ml-0.5">•</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.issuing_institution_name}
                        {r.source_type === 'external' && (
                          <span className="ml-1 text-xs text-gray-400">(external)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {Number(r.credits).toFixed(2)}
                        {r.grade && <span className="ml-1 text-xs text-gray-500">({r.grade})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full border capitalize ${STATUS_BADGE[r.status] || ''}`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openView(r)}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            View
                          </button>
                          {r.status === 'pending' && (
                            <button
                              onClick={() => handleStartReview(r.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Start review
                            </button>
                          )}
                          {['pending', 'under_review'].includes(r.status) && (
                            <>
                              <button
                                onClick={() => openApprove(r)}
                                className="text-xs text-green-600 hover:text-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openReject(r)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          })()}
        </div>

        {/* View / approve / reject modal */}
        <AccessibleModal
          isOpen={selected !== null}
          onClose={closeModal}
          title={
            mode === 'approve'
              ? 'Approve Credit Transfer'
              : mode === 'reject'
              ? 'Reject Credit Transfer'
              : 'Credit Record Detail'
          }
          size="lg"
        >
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Student: </span>
                  <span className="font-medium">{selected.student?.name}</span>
                </p>
                <p>
                  <span className="text-gray-500">Course: </span>
                  <span className="font-medium">{selected.course_title}</span>
                  {selected.course_code && (
                    <span className="text-gray-500"> ({selected.course_code})</span>
                  )}
                </p>
                <p>
                  <span className="text-gray-500">Institution: </span>
                  {selected.issuing_institution_name}
                </p>
                <p>
                  <span className="text-gray-500">Credits: </span>
                  {Number(selected.credits).toFixed(2)}
                  {selected.grade && <span className="ml-2">Grade: {selected.grade}</span>}
                  {selected.grade_scale && (
                    <span className="text-gray-500 text-xs ml-1">({selected.grade_scale})</span>
                  )}
                </p>
                {selected.completion_date && (
                  <p>
                    <span className="text-gray-500">Completed: </span>
                    {new Date(selected.completion_date).toLocaleDateString()}
                  </p>
                )}
                {selected.evidence_url && (
                  <p>
                    <span className="text-gray-500">Evidence: </span>
                    <a
                      href={selected.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open document
                    </a>
                  </p>
                )}
                {selected.review_notes && (
                  <p>
                    <span className="text-gray-500">Previous review note: </span>
                    {selected.review_notes}
                  </p>
                )}
                {selected.student?.id && (
                  <p className="pt-1">
                    <a
                      href={`/transcript?student_id=${selected.student.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Icon icon="mdi:file-document-outline" className="w-3.5 h-3.5" />
                      View full transcript
                    </a>
                  </p>
                )}
              </div>

              <CommentThread recordId={selected.id} />

              {mode === 'approve' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Awarded credits
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={awarded}
                        onChange={(e) => setAwarded(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You may award fewer credits than submitted ({selected.credits}).
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Equivalent local course
                      </label>
                      <select
                        value={equivalentCourseId}
                        onChange={(e) => setEquivalentCourseId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">— No local equivalent —</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equivalence notes
                    </label>
                    <textarea
                      value={equivalenceNotes}
                      onChange={(e) => setEquivalenceNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="e.g. counts as 2 elective credits toward BSc IT"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review notes (optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3 pt-3 border-t border-gray-200">
                    <Button onClick={handleApprove} disabled={submitting}>
                      {submitting ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {mode === 'reject' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for rejection *
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="The student will see this reason."
                    />
                  </div>
                  <div className="flex gap-3 pt-3 border-t border-gray-200">
                    <Button onClick={handleReject} disabled={submitting}>
                      {submitting ? 'Rejecting…' : 'Reject'}
                    </Button>
                    <Button variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {mode === 'view' && (
                <div className="flex gap-3 pt-3 border-t border-gray-200">
                  <Button variant="outline" onClick={closeModal}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </AccessibleModal>
      </div>
    </RoleGuard>
  );
}

function CountCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'amber' | 'blue' | 'green' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    gray: 'text-gray-700',
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
