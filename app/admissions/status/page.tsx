'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Review {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  order: number;
  required: boolean;
  options: Record<string, unknown>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: 'Received' },
  under_review: { label: 'Under Review', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: 'Being reviewed' },
  changes_requested: { label: 'Changes Requested', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: 'Action needed' },
  resubmitted: { label: 'Resubmitted', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', icon: 'Resubmitted' },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: 'Congratulations!' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: 'Not accepted' },
  waitlisted: { label: 'Waitlisted', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: 'On waitlist' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: 'Withdrawn' },
};

function StatusPageContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    application: Record<string, unknown>;
    form: { title: string; slug: string };
    reviews: Review[];
    documents: Document[];
    fields: FormField[];
  } | null>(null);

  // Resubmit state
  const [resubmitMode, setResubmitMode] = useState(false);
  const [resubmitAnswers, setResubmitAnswers] = useState<Record<string, unknown>>({});
  const [resubmitting, setResubmitting] = useState(false);

  const fetchStatus = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admissions/public/status?token=${encodeURIComponent(t)}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Application not found');
        setData(null);
        return;
      }
      const result = await res.json();
      setData(result);

      // Pre-fill answers for resubmit
      const answers: Record<string, unknown> = {};
      for (const a of (result.application.answers || []) as Array<{ field_id: string; answer: unknown }>) {
        answers[a.field_id] = a.answer;
      }
      setResubmitAnswers(answers);
    } catch {
      setError('Failed to fetch status');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokenFromUrl) fetchStatus(tokenFromUrl);
  }, [tokenFromUrl, fetchStatus]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(token);
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      const answersArray = Object.entries(resubmitAnswers).map(([field_id, answer]) => ({ field_id, answer }));

      const res = await fetch('/api/admissions/public/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, answers: answersArray }),
      });

      if (res.ok) {
        setResubmitMode(false);
        fetchStatus(token);
      } else {
        const d = await res.json();
        setError(d.error || 'Resubmission failed');
      }
    } catch {
      setError('Failed to resubmit');
    } finally {
      setResubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Token input form
  if (!data && !loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Status</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your tracking token to check your application status.</p>

        <form onSubmit={handleLookup} className="bg-white border border-gray-200 rounded-none p-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tracking Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste your tracking token here..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-none font-mono"
            />
            <button
              type="submit"
              disabled={!token.trim()}
              className="px-6 py-2 text-sm font-medium bg-oecs-navy-blue text-white rounded-none hover:opacity-90 disabled:opacity-50 transition"
            >
              Check Status
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
        <div className="animate-pulse h-24 bg-gray-200 rounded" />
        <div className="animate-pulse h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const status = data.application.status as string;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  const isChangesRequested = status === 'changes_requested';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Status</h1>
      <p className="text-sm text-gray-500 mb-6">{data.form.title}</p>

      {/* Status Badge */}
      <div className={`border rounded-none p-5 mb-6 ${statusConfig.bg}`}>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Current Status</p>
        <p className={`text-xl font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
        <p className="text-sm text-gray-500 mt-1">{statusConfig.icon}</p>
      </div>

      {/* Change Request Feedback */}
      {isChangesRequested && data.application.change_request_message && (
        <div className="bg-amber-50 border border-amber-200 rounded-none p-5 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Reviewer Feedback</h3>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{data.application.change_request_message as string}</p>
          {!resubmitMode && (
            <button
              onClick={() => setResubmitMode(true)}
              className="mt-4 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-none hover:bg-amber-700 transition"
            >
              Edit & Resubmit
            </button>
          )}
        </div>
      )}

      {/* Resubmit Form */}
      {resubmitMode && (
        <div className="bg-white border border-gray-200 rounded-none p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Update Your Answers</h3>
          <div className="space-y-4">
            {data.fields.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {['text', 'email', 'phone'].includes(field.type) && (
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    value={(resubmitAnswers[field.id] as string) || ''}
                    onChange={e => setResubmitAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none"
                  />
                )}
                {field.type === 'essay' && (
                  <textarea
                    value={(resubmitAnswers[field.id] as string) || ''}
                    onChange={e => setResubmitAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none resize-y"
                  />
                )}
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={(resubmitAnswers[field.id] as string) || ''}
                    onChange={e => setResubmitAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none"
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={(resubmitAnswers[field.id] as string) || ''}
                    onChange={e => setResubmitAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none bg-white"
                  >
                    <option value="">Select...</option>
                    {((field.options.choices as string[]) || []).map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                {field.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {((field.options.choices as string[]) || []).map((c, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`re-${field.id}`}
                          checked={(resubmitAnswers[field.id] as string) === c}
                          onChange={() => setResubmitAnswers(prev => ({ ...prev, [field.id]: c }))}
                        />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'multiple_select' && (
                  <div className="space-y-2">
                    {((field.options.choices as string[]) || []).map((c, i) => {
                      const checked = ((resubmitAnswers[field.id] as string[]) || []).includes(c);
                      return (
                        <label key={i} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setResubmitAnswers(prev => {
                                const current = (prev[field.id] as string[]) || [];
                                const updated = checked ? current.filter(x => x !== c) : [...current, c];
                                return { ...prev, [field.id]: updated };
                              });
                            }}
                          />
                          <span className="text-sm">{c}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {field.type === 'rating_scale' && (
                  <div className="flex gap-2">
                    {Array.from({ length: (field.options.max_rating as number) || 5 }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setResubmitAnswers(prev => ({ ...prev, [field.id]: num }))}
                        className={`w-10 h-10 rounded-none border text-sm font-medium transition ${
                          (resubmitAnswers[field.id] as number) === num
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleResubmit}
              disabled={resubmitting}
              className="px-6 py-2.5 text-sm font-medium bg-oecs-navy-blue text-white rounded-none hover:opacity-90 disabled:opacity-50 transition"
            >
              {resubmitting ? 'Submitting...' : 'Resubmit Application'}
            </button>
            <button
              onClick={() => setResubmitMode(false)}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {/* Applicant Info */}
      <div className="bg-white border border-gray-200 rounded-none p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Your Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-400">Name</p>
            <p className="text-sm font-medium text-gray-900">{data.application.applicant_name as string}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-900">{data.application.applicant_email as string}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Submitted</p>
            <p className="text-sm font-medium text-gray-900">
              {data.application.submitted_at ? new Date(data.application.submitted_at as string).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Documents */}
      {data.documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-none p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Uploaded Documents</h3>
          <div className="space-y-2">
            {data.documents.map(doc => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-gray-100 rounded-none hover:bg-gray-50 transition"
              >
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Review Timeline */}
      {data.reviews.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-none p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Timeline</h3>
          <div className="space-y-4">
            {data.reviews.map((review, i) => (
              <div key={review.id} className="relative pl-5">
                {i < data.reviews.length - 1 && (
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
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
        <div className="animate-pulse h-24 bg-gray-200 rounded" />
      </div>
    }>
      <StatusPageContent />
    </Suspense>
  );
}
