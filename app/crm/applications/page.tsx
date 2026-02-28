'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  programme_title: string;
  campaign_name: string;
  status: string;
  submitted_at: string;
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

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-32 bg-gray-200 rounded-none animate-pulse" />
        <div className="h-3 w-44 bg-gray-100 rounded-none animate-pulse mt-2" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-36 bg-gray-200 rounded-none animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 bg-gray-200 rounded-none animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-3 w-16 bg-gray-200 rounded-none animate-pulse" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-4 w-10 bg-gray-200 rounded-none animate-pulse ml-auto" />
      </td>
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

  useEffect(() => {
    fetchProgrammes();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, programmeFilter]);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, page, searchTerm, programmeFilter]);

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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1);
    }, 300);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (programmeFilter) params.set('programme_id', programmeFilter);

      const res = await fetch(`/api/crm/applications?${params}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
        body: JSON.stringify({
          application_ids: Array.from(selectedIds),
          status: action,
        }),
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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 bg-gray-200 rounded-none animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-none border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-100 rounded-none animate-pulse" />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-none border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-6 py-3 text-left"><div className="h-3 w-4 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-right"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse ml-auto" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Applications</h1>
            {total > 0 && (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {total}
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-none border border-gray-100 p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3.5 py-1.5 rounded-none text-sm font-medium transition-all duration-200 ${
                    statusFilter === key
                      ? 'bg-oecs-navy-blue text-white shadow-sm'
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
              className="px-3 py-1.5 border border-gray-200 rounded-none bg-gray-50 text-sm text-gray-700 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none"
            >
              <option value="">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search applicants..."
                defaultValue={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-none bg-gray-50 text-sm text-gray-900 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-oecs-navy-blue rounded-none p-4 mb-6 shadow-md flex items-center justify-between">
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
                className="px-4 py-2 bg-emerald-500 text-white rounded-none hover:bg-emerald-600 transition-all duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon icon="mdi:check" className="w-4 h-4" />
                )}
                Approve Selected
              </button>
              <button
                onClick={() => handleBulkAction('rejected')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-red-500 text-white rounded-none hover:bg-red-600 transition-all duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon icon="mdi:close" className="w-4 h-4" />
                )}
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
        <div className="bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selectedIds.size === applications.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-oecs-navy-blue border-gray-300 rounded focus:ring-blue-500"
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
                          <Icon icon="mdi:file-document-outline" className="w-8 h-8 text-oecs-navy-blue" />
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
                            className="w-4 h-4 text-oecs-navy-blue border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {application.applicant_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {application.applicant_email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {application.programme_title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {application.campaign_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {formatRelativeDate(application.submitted_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/crm/applications/${application.id}`}
                            className="text-oecs-navy-blue hover:text-blue-900 font-semibold text-sm transition-colors"
                          >
                            View
                          </Link>
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
                className="px-3 py-1.5 border border-gray-200 rounded-none text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-none text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
