'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface EnrichedAnswer {
  field_id: string;
  answer: unknown;
  label: string;
  type: string;
  options: Record<string, unknown>;
}

interface Review {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  reviewer_name: string;
}

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  under_review: { label: 'Under Review', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  changes_requested: { label: 'Changes Requested', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  resubmitted: { label: 'Resubmitted', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  waitlisted: { label: 'Waitlisted', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Record<string, unknown> | null>(null);
  const [enrichedAnswers, setEnrichedAnswers] = useState<EnrichedAnswer[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admissions/applications/${id}`);
      if (!res.ok) { router.push('/crm/admissions'); return; }
      const data = await res.json();
      setApplication(data.application);
      setEnrichedAnswers(data.enriched_answers || []);
      setDocuments(data.documents || []);
      setReviews(data.reviews || []);
    } catch {
      console.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admissions/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined, ...extra }),
      });
      if (res.ok) {
        setNotes('');
        setChangeMessage('');
        setShowChangeForm(false);
        setShowApproveConfirm(false);
        fetchData();
      }
    } catch {
      console.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-60 bg-gray-200 rounded" />
            </div>
            <div className="h-80 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const status = application.status as string;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;

  const canReview = !['approved', 'rejected', 'withdrawn'].includes(status);
  const canApprove = !['approved', 'withdrawn'].includes(status);
  const canRequestChanges = !['approved', 'rejected', 'withdrawn', 'changes_requested'].includes(status);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const renderAnswer = (answer: EnrichedAnswer) => {
    const value = answer.answer;
    if (value === null || value === undefined || value === '') return <span className="text-gray-400 italic">Not provided</span>;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/crm/admissions" className="text-gray-400 hover:text-gray-600">
          <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Application Review</h1>
          <p className="text-sm text-gray-500">{application.form_title as string}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application Details (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Card */}
          <div className="bg-white border border-gray-200 rounded-none p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Applicant Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{application.applicant_name as string}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{application.applicant_email as string}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-900">{(application.applicant_phone as string) || '—'}</p>
              </div>
            </div>
          </div>

          {/* Answers */}
          <div className="bg-white border border-gray-200 rounded-none p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Application Answers</h2>
            {enrichedAnswers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No answers submitted</p>
            ) : (
              <div className="space-y-4">
                {enrichedAnswers.map((answer, i) => (
                  <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">{answer.label}</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{renderAnswer(answer)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-none p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Uploaded Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-none hover:bg-gray-50 transition"
                  >
                    <Icon icon="mdi:file-document-outline" className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-400">{doc.file_type} &middot; {formatFileSize(doc.file_size)}</p>
                    </div>
                    <Icon icon="mdi:download" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions & Timeline (1/3) */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`border rounded-none p-5 ${statusConfig.bg}`}>
            <p className="text-xs font-semibold uppercase mb-1">Status</p>
            <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
            {application.reviewed_at && (
              <p className="text-xs text-gray-500 mt-1">
                Reviewed: {new Date(application.reviewed_at as string).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {canReview && (
            <div className="bg-white border border-gray-200 rounded-none p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Actions</h3>

              <textarea
                placeholder="Add notes (optional)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                {status !== 'under_review' && (
                  <button
                    onClick={() => handleAction('under_review')}
                    disabled={actionLoading}
                    className="px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-none hover:bg-indigo-100 disabled:opacity-50 transition"
                  >
                    <Icon icon="mdi:eye-outline" className="w-3.5 h-3.5 inline mr-1" />
                    Under Review
                  </button>
                )}

                {canApprove && (
                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    disabled={actionLoading}
                    className="px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none hover:bg-emerald-100 disabled:opacity-50 transition"
                  >
                    <Icon icon="mdi:check-circle" className="w-3.5 h-3.5 inline mr-1" />
                    Approve
                  </button>
                )}

                {canRequestChanges && (
                  <button
                    onClick={() => setShowChangeForm(true)}
                    disabled={actionLoading}
                    className="px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-none hover:bg-amber-100 disabled:opacity-50 transition"
                  >
                    <Icon icon="mdi:pencil" className="w-3.5 h-3.5 inline mr-1" />
                    Request Changes
                  </button>
                )}

                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="px-3 py-2 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-none hover:bg-red-100 disabled:opacity-50 transition"
                >
                  <Icon icon="mdi:close-circle" className="w-3.5 h-3.5 inline mr-1" />
                  Reject
                </button>

                <button
                  onClick={() => handleAction('waitlist')}
                  disabled={actionLoading}
                  className="px-3 py-2 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-none hover:bg-violet-100 disabled:opacity-50 transition"
                >
                  <Icon icon="mdi:playlist-star" className="w-3.5 h-3.5 inline mr-1" />
                  Waitlist
                </button>
              </div>

              {/* Change Request Form */}
              {showChangeForm && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Feedback for applicant:</p>
                  <textarea
                    value={changeMessage}
                    onChange={e => setChangeMessage(e.target.value)}
                    rows={3}
                    placeholder="Describe what changes are needed..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('request_changes', { message: changeMessage })}
                      disabled={!changeMessage.trim() || actionLoading}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-amber-600 text-white rounded-none hover:bg-amber-700 disabled:opacity-50 transition"
                    >
                      Send Feedback
                    </button>
                    <button
                      onClick={() => { setShowChangeForm(false); setChangeMessage(''); }}
                      className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Approve Confirmation */}
              {showApproveConfirm && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-none p-3 mb-3">
                    <p className="text-xs text-amber-800 font-medium">This will create a user account for the applicant and enroll them in the associated programme (if any).</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-none hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {actionLoading ? 'Processing...' : 'Confirm Approval'}
                    </button>
                    <button
                      onClick={() => setShowApproveConfirm(false)}
                      className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Timeline */}
          <div className="bg-white border border-gray-200 rounded-none p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Review History</h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No review history</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review, i) => (
                  <div key={review.id} className="relative pl-5">
                    {i < reviews.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200" />
                    )}
                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-200 border-2 border-white" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {review.old_status ? `${review.old_status} → ` : ''}{review.new_status}
                      </p>
                      {review.notes && (
                        <p className="text-xs text-gray-500 mt-0.5">{review.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {review.reviewer_name} &middot; {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
