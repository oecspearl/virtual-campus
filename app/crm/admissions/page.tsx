'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  form_title: string;
  status: string;
  submitted_at: string;
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

export default function AdmissionsPage() {
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

  // Debounce search
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
        body: JSON.stringify({
          application_ids: Array.from(selectedIds),
          decision: bulkAction,
        }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setBulkAction('');
        fetchApplications();
      }
    } catch {
      console.error('Bulk action failed');
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
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map(a => a.id)));
    }
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
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage student applications and enrollment</p>
        </div>
        <Link
          href="/crm/admissions/forms"
          className="flex items-center gap-2 px-4 py-2.5 bg-oecs-navy-blue text-white text-sm font-medium rounded-none hover:opacity-90 transition"
        >
          <Icon icon="mdi:file-document-edit" className="w-4 h-4" />
          Manage Forms
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-none p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={s.icon} className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-none p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-none transition ${!statusFilter ? 'bg-oecs-navy-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {Object.entries(STATUS_BADGES).map(([key, badge]) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-none transition ${statusFilter === key ? 'bg-oecs-navy-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {badge.label}
              </button>
            ))}
          </div>

          {/* Form filter */}
          <select
            value={formFilter}
            onChange={(e) => { setFormFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-none bg-white"
          >
            <option value="">All Forms</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-none"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-none p-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            className="px-3 py-1.5 text-sm border border-blue-200 rounded-none bg-white"
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
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-none hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Apply
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkAction(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-4 bg-gray-200 rounded" />
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <Icon icon="mdi:inbox-outline" className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === applications.length && applications.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applicant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Form</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map(app => {
                const badge = STATUS_BADGES[app.status] || STATUS_BADGES.submitted;
                return (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{app.applicant_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{app.applicant_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{app.form_title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-none ${badge.color}`}>
                        <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm/admissions/${app.id}`}
                        className="text-oecs-navy-blue hover:underline text-sm font-medium"
                      >
                        View
                      </Link>
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
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-none hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-none hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
