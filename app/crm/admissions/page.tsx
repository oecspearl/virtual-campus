'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  form_title: string;
  status: string;
  submitted_at: string;
}

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

interface AppDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-50 text-blue-700', icon: 'mdi:inbox-arrow-down' },
  under_review: { label: 'Under Review', color: 'bg-indigo-50 text-indigo-700', icon: 'mdi:eye-outline' },
  changes_requested: { label: 'Changes Requested', color: 'bg-amber-50 text-amber-700', icon: 'mdi:pencil-outline' },
  resubmitted: { label: 'Resubmitted', color: 'bg-cyan-50 text-cyan-700', icon: 'mdi:refresh' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700', icon: 'mdi:check-circle-outline' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700', icon: 'mdi:close-circle-outline' },
  waitlisted: { label: 'Waitlisted', color: 'bg-violet-50 text-violet-700', icon: 'mdi:playlist-star' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-50 text-gray-500', icon: 'mdi:account-cancel' },
};

const LIMIT = 50;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AdmissionsPage() {
  const { showToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activeForms, setActiveForms] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [forms, setForms] = useState<Array<{ id: string; title: string }>>([]);

  // Detail modal state
  const [detailApp, setDetailApp] = useState<Record<string, unknown> | null>(null);
  const [detailAnswers, setDetailAnswers] = useState<EnrichedAnswer[]>([]);
  const [detailDocuments, setDetailDocuments] = useState<AppDocument[]>([]);
  const [detailReviews, setDetailReviews] = useState<Review[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (formFilter) params.set('form_id', formFilter);
      if (searchDebounced) params.set('search', searchDebounced);

      const res = await fetch(`/api/admissions/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setStatusCounts(data.status_counts || {});
      setActiveForms(data.active_forms || 0);
    } catch {
      console.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, formFilter, searchDebounced]);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/admissions/forms');
      const data = await res.json();
      setForms((data.forms || []).map((f: { id: string; title: string }) => ({ id: f.id, title: f.title })));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/admissions/applications/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_ids: Array.from(selectedIds), decision: bulkAction }),
      });
      if (res.ok) {
        showToast(`Bulk action applied to ${selectedIds.size} application(s)`, 'success');
        setSelectedIds(new Set());
        setBulkAction('');
        fetchApplications();
      }
    } catch {
      showToast('Bulk action failed', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === applications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(applications.map(a => a.id)));
  };

  // Detail modal functions
  const openDetail = async (appId: string) => {
    setDetailLoading(true);
    setDetailApp(null);
    setDetailAnswers([]);
    setDetailDocuments([]);
    setDetailReviews([]);
    setNotes('');
    setChangeMessage('');
    setShowChangeForm(false);
    setShowApproveConfirm(false);

    try {
      const res = await fetch(`/api/admissions/applications/${appId}`);
      if (!res.ok) { showToast('Failed to load application', 'error'); setDetailLoading(false); return; }
      const data = await res.json();
      setDetailApp(data.application);
      setDetailAnswers(data.enriched_answers || []);
      setDetailDocuments(data.documents || []);
      setDetailReviews(data.reviews || []);
    } catch {
      showToast('Failed to load application', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailApp(null);
    setDetailAnswers([]);
    setDetailDocuments([]);
    setDetailReviews([]);
  };

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!detailApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admissions/applications/${detailApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined, ...extra }),
      });
      if (res.ok) {
        showToast('Action applied successfully', 'success');
        setNotes('');
        setChangeMessage('');
        setShowChangeForm(false);
        setShowApproveConfirm(false);
        openDetail(detailApp.id as string);
        fetchApplications();
      } else {
        showToast('Action failed', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderAnswer = (answer: EnrichedAnswer) => {
    const value = answer.answer;
    if (value === null || value === undefined || value === '') return <span className="text-gray-400 italic">Not provided</span>;
    if (Array.isArray(value)) return <span>{value.join(', ')}</span>;
    return <span>{String(value)}</span>;
  };

  const totalApps = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const approvedCount = statusCounts['approved'] || 0;
  const rejectedCount = statusCounts['rejected'] || 0;
  const pendingCount = (statusCounts['submitted'] || 0) + (statusCounts['under_review'] || 0) + (statusCounts['resubmitted'] || 0);
  const approvalRate = totalApps > 0 ? Math.round((approvedCount / totalApps) * 100) : 0;

  const stats = [
    { label: 'Total', value: totalApps, icon: 'mdi:inbox-full', color: 'text-gray-700' },
    { label: 'Pending', value: pendingCount, icon: 'mdi:clock-outline', color: 'text-amber-600' },
    { label: 'Approved', value: approvedCount, icon: 'mdi:check-circle', color: 'text-emerald-600' },
    { label: 'Rejected', value: rejectedCount, icon: 'mdi:close-circle', color: 'text-red-600' },
    { label: 'Approval Rate', value: `${approvalRate}%`, icon: 'mdi:percent', color: 'text-blue-600' },
    { label: 'Active Forms', value: activeForms, icon: 'mdi:file-document-edit', color: 'text-violet-600' },
  ];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admissions</h1>
            <p className="text-sm text-gray-500 mt-1">Manage student applications and enrollment</p>
          </div>
          <Link
            href="/crm/admissions/forms"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-900 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:file-document-edit" className="w-4 h-4" />
            Manage Forms
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon={s.icon} className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setStatusFilter(''); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {Object.entries(STATUS_BADGES).map(([key, badge]) => (
                <button
                  key={key}
                  onClick={() => { setStatusFilter(key); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {badge.label}
                </button>
              ))}
            </div>

            <select
              value={formFilter}
              onChange={(e) => { setFormFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
            >
              <option value="">All Forms</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-600 rounded-lg p-4 mb-4 shadow-md flex items-center gap-3">
            <Icon icon="mdi:checkbox-marked-circle" className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-white">{selectedIds.size} selected</span>
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="px-3 py-1.5 text-sm border border-white/20 rounded-lg bg-white/10 text-white"
            >
              <option value="">Select action...</option>
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
              <option value="waitlisted">Waitlist</option>
              <option value="under_review">Mark Under Review</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
            >
              Apply
            </button>
            <button
              onClick={() => { setSelectedIds(new Set()); setBulkAction(''); }}
              className="text-sm text-white/70 hover:text-white ml-auto"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="flex-1 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-32 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-24 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-20 h-4 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:inbox-outline" className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium">No applications found</p>
              <p className="text-gray-400 text-sm mt-1">
                {statusFilter || search || formFilter ? 'Try adjusting your filters.' : 'Applications will appear here when submitted.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.size === applications.length && applications.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="w-16 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map(app => {
                  const badge = STATUS_BADGES[app.status] || STATUS_BADGES.submitted;
                  return (
                    <tr key={app.id} className={`hover:bg-blue-50/30 transition-colors ${selectedIds.has(app.id) ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(app.id)} onChange={() => toggleSelect(app.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{app.applicant_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{app.applicant_email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{app.form_title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${badge.color}`}>
                          <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '\u2014'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(app.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-semibold transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * LIMIT + 1}\u2013{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {(detailApp || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={closeDetail}>
          <div className="bg-white rounded-lg border border-gray-100 w-full max-w-5xl my-8" onClick={(e) => e.stopPropagation()}>
            {detailLoading && !detailApp ? (
              <div className="p-8 space-y-4">
                <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              </div>
            ) : detailApp && (() => {
              const status = detailApp.status as string;
              const statusBadge = STATUS_BADGES[status] || STATUS_BADGES.submitted;
              const canReview = !['approved', 'rejected', 'withdrawn'].includes(status);
              const canApprove = !['approved', 'withdrawn'].includes(status);
              const canRequestChanges = !['approved', 'rejected', 'withdrawn', 'changes_requested'].includes(status);

              return (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-gray-900">Application Review</h2>
                      <p className="text-sm text-gray-400 mt-0.5">{detailApp.form_title as string}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${statusBadge.color}`}>
                        <Icon icon={statusBadge.icon} className="w-3.5 h-3.5" />
                        {statusBadge.label}
                      </span>
                      <button onClick={closeDetail} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Icon icon="mdi:close" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    {/* Left: Details */}
                    <div className="lg:col-span-2 p-6 space-y-6 border-r border-gray-100">
                      {/* Applicant Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Applicant Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-400">Full Name</p>
                            <p className="text-sm font-medium text-gray-900">{detailApp.applicant_name as string}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-900">{detailApp.applicant_email as string}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{(detailApp.applicant_phone as string) || '\u2014'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Answers */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Icon icon="mdi:file-document-outline" className="w-4 h-4 text-gray-400" />
                          Application Answers
                          <span className="text-xs font-normal text-gray-400">({detailAnswers.length})</span>
                        </h3>
                        {detailAnswers.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No answers submitted</p>
                        ) : (
                          <div className="space-y-3">
                            {detailAnswers.map((answer, i) => (
                              <div key={i} className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
                                <p className="text-xs font-semibold text-gray-500 mb-1">{answer.label}</p>
                                <div className="text-sm text-gray-900 whitespace-pre-wrap">{renderAnswer(answer)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Documents */}
                      {detailDocuments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Icon icon="mdi:paperclip" className="w-4 h-4 text-gray-400" />
                            Documents ({detailDocuments.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {detailDocuments.map(doc => (
                              <a
                                key={doc.id}
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                              >
                                <Icon icon="mdi:file-document-outline" className="w-6 h-6 text-blue-500 flex-shrink-0" />
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

                    {/* Right: Actions & Timeline */}
                    <div className="lg:col-span-1 p-6 space-y-6">
                      {/* Action Buttons */}
                      {canReview && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</h3>

                          <textarea
                            placeholder="Add notes (optional)..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            {status !== 'under_review' && (
                              <button
                                onClick={() => handleAction('under_review')}
                                disabled={actionLoading}
                                className="px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition"
                              >
                                <Icon icon="mdi:eye-outline" className="w-3.5 h-3.5 inline mr-1" />
                                Under Review
                              </button>
                            )}
                            {canApprove && (
                              <button
                                onClick={() => setShowApproveConfirm(true)}
                                disabled={actionLoading}
                                className="px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition"
                              >
                                <Icon icon="mdi:check-circle" className="w-3.5 h-3.5 inline mr-1" />
                                Approve
                              </button>
                            )}
                            {canRequestChanges && (
                              <button
                                onClick={() => setShowChangeForm(true)}
                                disabled={actionLoading}
                                className="px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition"
                              >
                                <Icon icon="mdi:pencil" className="w-3.5 h-3.5 inline mr-1" />
                                Request Changes
                              </button>
                            )}
                            <button
                              onClick={() => handleAction('reject')}
                              disabled={actionLoading}
                              className="px-3 py-2 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              <Icon icon="mdi:close-circle" className="w-3.5 h-3.5 inline mr-1" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleAction('waitlist')}
                              disabled={actionLoading}
                              className="px-3 py-2 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition"
                            >
                              <Icon icon="mdi:playlist-star" className="w-3.5 h-3.5 inline mr-1" />
                              Waitlist
                            </button>
                          </div>

                          {/* Change Request Form */}
                          {showChangeForm && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-medium text-gray-600 mb-2">Feedback for applicant:</p>
                              <textarea
                                value={changeMessage}
                                onChange={e => setChangeMessage(e.target.value)}
                                rows={3}
                                placeholder="Describe what changes are needed..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none mb-2 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction('request_changes', { message: changeMessage })}
                                  disabled={!changeMessage.trim() || actionLoading}
                                  className="flex-1 px-3 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
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
                            <div className="border-t border-gray-200 pt-3">
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                <p className="text-xs text-amber-800 font-medium">This will create a user account and enroll the applicant in the associated programme (if any).</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction('approve')}
                                  disabled={actionLoading}
                                  className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
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
                      <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Review History</h3>
                        {detailReviews.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No review history</p>
                        ) : (
                          <div className="space-y-4">
                            {detailReviews.map((review, i) => (
                              <div key={review.id} className="relative pl-5">
                                {i < detailReviews.length - 1 && (
                                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200" />
                                )}
                                <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-gray-200 border-2 border-white" />
                                <div>
                                  <p className="text-xs font-medium text-gray-700">
                                    {review.old_status ? `${review.old_status} \u2192 ` : ''}{review.new_status}
                                  </p>
                                  {review.notes && <p className="text-xs text-gray-500 mt-0.5">{review.notes}</p>}
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
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
