'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  programme_title: string;
  campaign_name: string;
  status: string;
  submitted_at: string;
}

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

interface Programme {
  id: string;
  title: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700', icon: 'mdi:clock-outline' },
  under_review: { label: 'Under Review', color: 'bg-blue-50 text-blue-700', icon: 'mdi:eye-outline' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700', icon: 'mdi:check-circle-outline' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700', icon: 'mdi:close-circle-outline' },
  waitlisted: { label: 'Waitlisted', color: 'bg-violet-50 text-violet-700', icon: 'mdi:playlist-star' },
};

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'waitlisted', label: 'Waitlisted' },
];

const REVIEW_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approve', icon: 'mdi:check-circle', color: 'text-emerald-600' },
  { value: 'rejected', label: 'Reject', icon: 'mdi:close-circle', color: 'text-red-600' },
  { value: 'waitlisted', label: 'Waitlist', icon: 'mdi:playlist-star', color: 'text-violet-600' },
  { value: 'under_review', label: 'Mark Under Review', icon: 'mdi:eye', color: 'text-blue-600' },
];

const LIMIT = 50;

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function renderAnswer(answer: ApplicationAnswer) {
  if (answer.answer === null || answer.answer === undefined || answer.answer === '') {
    return <span className="text-gray-300 italic text-sm">No answer provided</span>;
  }

  switch (answer.field_type) {
    case 'text':
    case 'essay':
      return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{String(answer.answer)}</p>;

    case 'multiple_choice': {
      const selectedOption = answer.options?.find((opt) => opt.id === answer.answer);
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
          <Icon icon="mdi:radiobox-marked" className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-700 font-medium">{selectedOption?.text || String(answer.answer)}</span>
        </div>
      );
    }

    case 'multiple_select': {
      const selectedValues: string[] = Array.isArray(answer.answer) ? answer.answer : [];
      if (selectedValues.length === 0) return <span className="text-gray-300 italic text-sm">No selections made</span>;
      return (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((val) => {
            const option = answer.options?.find((opt) => opt.id === val);
            return (
              <span key={val} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-lg">
                <Icon icon="mdi:checkbox-marked" className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-sm text-violet-700 font-medium">{option?.text || val}</span>
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
      return <p className="text-sm text-gray-700">{String(answer.answer)}</p>;
  }
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4">
        <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-3 w-44 bg-gray-100 rounded-lg animate-pulse mt-2" />
      </td>
      <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded-lg animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded-lg animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-3 w-16 bg-gray-200 rounded-lg animate-pulse" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-10 bg-gray-200 rounded-lg animate-pulse ml-auto" /></td>
    </tr>
  );
}

export default function CRMApplicationsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detail modal state
  const [detailApp, setDetailApp] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showReReview, setShowReReview] = useState(false);

  useEffect(() => {
    fetchProgrammes();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, programmeFilter]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (programmeFilter) params.set('programme_id', programmeFilter);

      const res = await fetch(`/api/crm/applications?${params}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; }
        showToast('Failed to load applications', 'error');
        return;
      }
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('CRM Applications: Error', error);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, searchTerm, programmeFilter, router, showToast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const fetchProgrammes = async () => {
    try {
      const res = await fetch('/api/programmes');
      if (res.ok) {
        const data = await res.json();
        setProgrammes(data.programmes || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch programmes:', err);
    }
  };

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1);
    }, 300);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    const label = action === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${label} ${selectedIds.size} application(s)?`)) return;

    try {
      setBulkProcessing(true);
      const res = await fetch('/api/crm/applications/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_ids: Array.from(selectedIds), status: action }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || `Successfully ${action} ${selectedIds.size} application(s)`, 'success');
        setSelectedIds(new Set());
        fetchApplications();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || `Failed to ${label} applications`, 'error');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showToast(`Failed to ${label} applications`, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Detail modal functions
  const openDetail = async (appId: string) => {
    try {
      setDetailLoading(true);
      setDetailApp(null);
      setReviewStatus('');
      setReviewNotes('');
      setShowReReview(false);

      const res = await fetch(`/api/crm/applications/${appId}`);
      if (!res.ok) {
        showToast('Failed to load application details', 'error');
        setDetailLoading(false);
        return;
      }
      const data: ApplicationDetail = await res.json();
      setDetailApp(data);
    } catch (error) {
      console.error('Application detail error:', error);
      showToast('Failed to load application details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailApp(null);
    setReviewStatus('');
    setReviewNotes('');
    setShowReReview(false);
  };

  const handleSubmitReview = async () => {
    if (!detailApp || !reviewStatus) {
      showToast('Please select a review decision', 'warning');
      return;
    }

    try {
      setReviewing(true);
      const res = await fetch(`/api/crm/applications/${detailApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewStatus, review_notes: reviewNotes }),
      });

      if (res.ok) {
        showToast('Review submitted successfully', 'success');
        // Refresh detail and list
        openDetail(detailApp.id);
        fetchApplications();
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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  if (loading) {
    return (
      <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3"><div className="h-3 w-4 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></th>
                  <th className="px-6 py-3"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse ml-auto" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Applications</h1>
            {total > 0 && (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{total}</span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
            >
              <option value="">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search applicants..."
                defaultValue={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-600 rounded-lg p-4 mb-6 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:checkbox-marked-circle" className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">
                {selectedIds.size} application{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('approved')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkProcessing ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:check" className="w-4 h-4" />}
                Approve Selected
              </button>
              <button
                onClick={() => handleBulkAction('rejected')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkProcessing ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:close" className="w-4 h-4" />}
                Reject Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selectedIds.size === applications.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Programme</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <Icon icon="mdi:file-document-outline" className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-gray-600 font-medium">No applications found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {statusFilter || searchTerm || programmeFilter
                            ? 'Try adjusting your filters to see more results.'
                            : 'Applications will appear here when candidates submit their forms.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications.map((application) => {
                    const badge = STATUS_BADGES[application.status] || STATUS_BADGES.pending;
                    const isSelected = selectedIds.has(application.id);

                    return (
                      <tr
                        key={application.id}
                        className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/20' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(application.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{application.applicant_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{application.applicant_email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{application.programme_title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{application.campaign_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{formatRelativeDate(application.submitted_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openDetail(application.id)}
                            className="text-blue-600 hover:text-blue-900 font-semibold text-sm transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">Showing {start}-{end} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* Application Detail Modal */}
      <AccessibleModal
        isOpen={!!(detailApp || detailLoading)}
        onClose={closeDetail}
        title={detailApp?.applicant_name || 'Application Details'}
        description={detailApp?.applicant_email || undefined}
        size="full"
      >
            {detailLoading && !detailApp ? (
              <div className="p-8 space-y-4">
                <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              </div>
            ) : detailApp && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Icon icon="mdi:account" className="w-5 h-5 text-blue-600" />
                  </div>
                  {(() => {
                    const b = STATUS_BADGES[detailApp.status] || STATUS_BADGES.pending;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${b.color}`}>
                        <Icon icon={b.icon} className="w-3.5 h-3.5" />
                        {b.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Left: Details */}
                  <div className="lg:col-span-2 p-6 space-y-6 border-r border-gray-100">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Programme</div>
                        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Icon icon="mdi:school-outline" className="w-4 h-4 text-gray-400" />
                          {detailApp.programme_title}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Campaign</div>
                        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Icon icon="mdi:bullhorn-outline" className="w-4 h-4 text-gray-400" />
                          {detailApp.campaign_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Icon icon="mdi:calendar-outline" className="w-3.5 h-3.5" />
                      Submitted {formatDate(detailApp.submitted_at)}
                    </div>

                    {/* Answers */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Icon icon="mdi:file-document-outline" className="w-4 h-4 text-gray-400" />
                        Application Responses
                        <span className="text-xs font-normal text-gray-400">
                          ({detailApp.answers.length} field{detailApp.answers.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      {detailApp.answers.length === 0 ? (
                        <div className="text-center py-8">
                          <Icon icon="mdi:file-question-outline" className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No responses recorded.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {detailApp.answers.map((answer) => (
                            <div key={answer.field_id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                              <div className="flex items-start gap-2 mb-2">
                                <Icon icon="mdi:help-circle-outline" className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                                <label className="text-sm font-semibold text-gray-600">{answer.question_text}</label>
                              </div>
                              <div className="ml-6">{renderAnswer(answer)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Review Panel */}
                  <div className="lg:col-span-1 p-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Review Decision</h3>

                    {(() => {
                      const isReviewed = !!detailApp.reviewed_at;
                      const canReview = !isReviewed || showReReview;

                      if (canReview) {
                        return (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {REVIEW_STATUS_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 ${
                                    reviewStatus === option.value
                                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500/20'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="review-status"
                                    value={option.value}
                                    checked={reviewStatus === option.value}
                                    onChange={() => setReviewStatus(option.value)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  <Icon icon={option.icon} className={`w-4 h-4 ${option.color}`} />
                                  <span className="text-sm font-medium text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Review Notes</label>
                              <textarea
                                rows={3}
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none resize-y"
                                placeholder="Add notes about your decision..."
                              />
                            </div>

                            <button
                              onClick={handleSubmitReview}
                              disabled={reviewing || !reviewStatus}
                              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                              {reviewing ? (
                                <><Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> Submitting...</>
                              ) : (
                                <><Icon icon="mdi:gavel" className="w-4 h-4" /> Submit Review</>
                              )}
                            </button>

                            {showReReview && (
                              <button
                                onClick={() => { setShowReReview(false); setReviewStatus(''); setReviewNotes(''); }}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                Cancel Re-review
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Icon icon="mdi:account-check-outline" className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">Reviewed by</span>
                              <span className="font-semibold text-gray-700">{detailApp.reviewed_by_name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon icon="mdi:calendar-check-outline" className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500">On</span>
                              <span className="font-medium text-gray-700">
                                {detailApp.reviewed_at ? formatDate(detailApp.reviewed_at) : '-'}
                              </span>
                            </div>
                            {detailApp.review_notes && (
                              <div className="border-t border-gray-200 pt-3 mt-3">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</span>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{detailApp.review_notes}</p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setShowReReview(true)}
                            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Icon icon="mdi:refresh" className="w-4 h-4" />
                            Change Decision
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
      </AccessibleModal>
    </div>
  );
}
