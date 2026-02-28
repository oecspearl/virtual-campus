'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface ApplicationAnswer {
  field_id: string;
  field_type: string;
  question_text: string;
  answer: any;
  options: Array<{ id: string; text: string }> | null;
}

interface ApplicationDetail {
  id: string;
  applicant_name: string;
  applicant_email: string;
  programme_id: string;
  programme_title: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  submitted_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  answers: ApplicationAnswer[];
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'mdi:clock-outline' },
  under_review: { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'mdi:eye-outline' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'mdi:check-circle-outline' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: 'mdi:close-circle-outline' },
  waitlisted: { label: 'Waitlisted', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: 'mdi:playlist-star' },
};

const REVIEW_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approve', icon: 'mdi:check-circle', color: 'text-emerald-600' },
  { value: 'rejected', label: 'Reject', icon: 'mdi:close-circle', color: 'text-red-600' },
  { value: 'waitlisted', label: 'Waitlist', icon: 'mdi:playlist-star', color: 'text-violet-600' },
  { value: 'under_review', label: 'Mark Under Review', icon: 'mdi:eye', color: 'text-blue-600' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SkeletonDetail() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse mt-3" />
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse mt-3" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse mb-4" />
              <div className="h-4 w-56 bg-gray-100 rounded-lg animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="h-5 w-24 bg-gray-200 rounded-lg animate-pulse" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2">
                  <div className="h-4 w-44 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="h-5 w-28 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-24 w-full bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReReview, setShowReReview] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/applications/${id}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        if (res.status === 404) {
          router.push('/crm/applications');
          return;
        }
        showToast('Failed to load application', 'error');
        return;
      }
      const data: ApplicationDetail = await res.json();
      setApplication(data);
      setReviewStatus('');
      setReviewNotes('');
      setShowReReview(false);
    } catch (error) {
      console.error('Application Detail: Error', error);
      showToast('Failed to load application', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewStatus) {
      showToast('Please select a review decision', 'warning');
      return;
    }

    try {
      setReviewing(true);
      const res = await fetch(`/api/crm/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          review_notes: reviewNotes,
        }),
      });

      if (res.ok) {
        showToast('Review submitted successfully', 'success');
        fetchApplication();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to submit review', 'error');
      }
    } catch (error) {
      console.error('Review submit error:', error);
      showToast('Failed to submit review', 'error');
    } finally {
      setReviewing(false);
    }
  };

  const renderAnswer = (answer: ApplicationAnswer) => {
    if (answer.answer === null || answer.answer === undefined || answer.answer === '') {
      return <span className="text-gray-300 italic text-sm">No answer provided</span>;
    }

    switch (answer.field_type) {
      case 'text':
      case 'essay':
        return (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {String(answer.answer)}
          </p>
        );

      case 'multiple_choice': {
        const selectedOption = answer.options?.find((opt) => opt.id === answer.answer);
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
            <Icon icon="mdi:radiobox-marked" className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-700 font-medium">
              {selectedOption?.text || String(answer.answer)}
            </span>
          </div>
        );
      }

      case 'multiple_select': {
        const selectedValues: string[] = Array.isArray(answer.answer) ? answer.answer : [];
        if (selectedValues.length === 0) {
          return <span className="text-gray-300 italic text-sm">No selections made</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((val) => {
              const option = answer.options?.find((opt) => opt.id === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-lg"
                >
                  <Icon icon="mdi:checkbox-marked" className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-sm text-violet-700 font-medium">
                    {option?.text || val}
                  </span>
                </span>
              );
            })}
          </div>
        );
      }

      case 'rating_scale':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <Icon icon="mdi:star" className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-700 font-bold">{String(answer.answer)}</span>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-700">{String(answer.answer)}</p>
        );
    }
  };

  if (loading || !application) {
    return <SkeletonDetail />;
  }

  const badge = STATUS_BADGES[application.status] || STATUS_BADGES.pending;
  const isReviewed = !!application.reviewed_at;
  const canReview = !isReviewed || showReReview;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/crm/applications"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
        >
          <Icon icon="mdi:arrow-left" className="w-4 h-4" />
          Back to Applications
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-oecs-navy-blue/10 flex items-center justify-center">
                    <Icon icon="mdi:account" className="w-6 h-6 text-oecs-navy-blue" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">
                      {application.applicant_name}
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">{application.applicant_email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${badge.color}`}>
                  <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Icon icon="mdi:calendar-outline" className="w-3.5 h-3.5" />
                  Submitted {formatDate(application.submitted_at)}
                </span>
              </div>
            </div>

            {/* Programme Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Programme</h2>
              <Link
                href={`/programmes/${application.programme_id}`}
                className="text-base font-bold text-gray-900 hover:text-oecs-navy-blue transition-colors flex items-center gap-2"
              >
                <Icon icon="mdi:school-outline" className="w-5 h-5 text-gray-400" />
                {application.programme_title}
                <Icon icon="mdi:open-in-new" className="w-3.5 h-3.5 text-gray-300" />
              </Link>
            </div>

            {/* Campaign Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Campaign</h2>
              <div className="flex items-center gap-2">
                <Icon icon="mdi:bullhorn-outline" className="w-5 h-5 text-gray-400" />
                <span className="text-base font-bold text-gray-900">{application.campaign_name}</span>
              </div>
            </div>

            {/* Answers Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
                  <Icon icon="mdi:file-document-outline" className="w-5 h-5 text-gray-400" />
                  Application Responses
                  <span className="text-xs font-normal text-gray-400">
                    ({application.answers.length} field{application.answers.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {application.answers.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon icon="mdi:file-question-outline" className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No responses recorded for this application.</p>
                  </div>
                ) : (
                  application.answers.map((answer) => (
                    <div
                      key={answer.field_id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Icon icon="mdi:help-circle-outline" className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <label className="text-sm font-semibold text-gray-600">
                          {answer.question_text}
                        </label>
                      </div>
                      <div className="ml-6">
                        {renderAnswer(answer)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Review Panel */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Review Decision
                </h2>

                {/* Current Status */}
                <div className="mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border ${badge.color}`}>
                    <Icon icon={badge.icon} className="w-5 h-5" />
                    {badge.label}
                  </div>
                </div>

                {canReview ? (
                  <div className="space-y-4">
                    {/* Status Selection */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Decision
                      </label>
                      <div className="space-y-2">
                        {REVIEW_STATUS_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                              reviewStatus === option.value
                                ? 'border-oecs-navy-blue bg-blue-50/50 ring-1 ring-blue-500/20'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="review-status"
                              value={option.value}
                              checked={reviewStatus === option.value}
                              onChange={() => setReviewStatus(option.value)}
                              className="w-4 h-4 text-oecs-navy-blue border-gray-300 focus:ring-blue-500"
                            />
                            <Icon icon={option.icon} className={`w-4 h-4 ${option.color}`} />
                            <span className="text-sm font-medium text-gray-700">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Review Notes
                      </label>
                      <textarea
                        rows={4}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                        placeholder="Add any notes about your decision..."
                      />
                    </div>

                    {/* Submit Review */}
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewing || !reviewStatus}
                      className="w-full py-3 bg-oecs-navy-blue text-white rounded-xl hover:bg-blue-900 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewing ? (
                        <>
                          <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                          Submitting Review...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:gavel" className="w-4 h-4" />
                          Submit Review
                        </>
                      )}
                    </button>

                    {showReReview && (
                      <button
                        onClick={() => {
                          setShowReReview(false);
                          setReviewStatus('');
                          setReviewNotes('');
                        }}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel Re-review
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Reviewed Info */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon icon="mdi:account-check-outline" className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Reviewed by</span>
                        <span className="font-semibold text-gray-700">
                          {application.reviewed_by_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Icon icon="mdi:calendar-check-outline" className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">On</span>
                        <span className="font-medium text-gray-700">
                          {application.reviewed_at ? formatDate(application.reviewed_at) : '-'}
                        </span>
                      </div>
                      {application.review_notes && (
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <div className="flex items-start gap-2">
                            <Icon icon="mdi:note-text-outline" className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</span>
                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                {application.review_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Re-review Button */}
                    <button
                      onClick={() => setShowReReview(true)}
                      className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Icon icon="mdi:refresh" className="w-4 h-4" />
                      Change Decision
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
