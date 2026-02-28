'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  segment_name: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_by_name: string | null;
  stats: { total: number; sent: number; failed: number; opened: number; clicked: number };
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: 'mdi:file-edit-outline' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700', icon: 'mdi:clock-outline' },
  sending: { label: 'Sending', color: 'bg-amber-50 text-amber-700', icon: 'mdi:send-clock' },
  sent: { label: 'Sent', color: 'bg-emerald-50 text-emerald-700', icon: 'mdi:check-circle-outline' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', icon: 'mdi:alert-circle-outline' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: 'mdi:cancel' },
};

const LIMIT = 50;

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="h-4 w-40 bg-gray-200 rounded-none animate-pulse" />
        <div className="h-3 w-56 bg-gray-100 rounded-none animate-pulse mt-2" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-gray-200 rounded-none animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 bg-gray-200 rounded-none animate-pulse" />
        <div className="h-1.5 w-20 bg-gray-100 rounded-full animate-pulse mt-2" />
      </td>
      <td className="px-6 py-4">
        <div className="h-3 w-24 bg-gray-200 rounded-none animate-pulse" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-4 w-10 bg-gray-200 rounded-none animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

export default function CRMCommunicationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, page, searchTerm]);

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(1);
    }, 300);
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/crm/campaigns?${params}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; }
        showToast('Failed to load campaigns', 'error');
        return;
      }
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('CRM Campaigns: Error', error);
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 bg-gray-200 rounded-none animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-gray-200 rounded-none animate-pulse" />
          </div>

          {/* Skeleton Filters */}
          <div className="bg-white rounded-none border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-100 rounded-none animate-pulse" />
              ))}
            </div>
          </div>

          {/* Skeleton Table */}
          <div className="bg-white rounded-none border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-6 py-3 text-left"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-14 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-12 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-left"><div className="h-3 w-12 bg-gray-200 rounded animate-pulse" /></th>
                    <th className="px-6 py-3 text-right"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></th>
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Communications</h1>
          </div>
          <Link
            href="/crm/communications/create"
            className="px-4 py-2.5 bg-oecs-navy-blue text-white rounded-none hover:bg-blue-900 transition-all duration-300 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Campaign
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-none border border-gray-100 p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3.5 py-1.5 rounded-none text-sm font-medium transition-all duration-200 ${!statusFilter ? 'bg-oecs-navy-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {Object.entries(STATUS_BADGES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3.5 py-1.5 rounded-none text-sm font-medium transition-all duration-200 ${statusFilter === key ? 'bg-oecs-navy-blue text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                defaultValue={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-none bg-gray-50 text-sm text-gray-900 transition-all duration-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <Icon icon="mdi:email-outline" className="w-8 h-8 text-oecs-navy-blue" />
                        </div>
                        <p className="text-gray-600 font-medium">No campaigns yet</p>
                        <p className="text-gray-400 text-sm mt-1">Get started by creating your first campaign.</p>
                        <Link href="/crm/communications/create" className="text-oecs-navy-blue hover:text-blue-900 font-semibold text-sm mt-3 inline-flex items-center gap-1 transition-colors">
                          <Icon icon="mdi:plus-circle-outline" className="w-4 h-4" />
                          Create your first campaign
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  campaigns.map(campaign => {
                    const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft;
                    const sentRatio = campaign.stats.total > 0 ? (campaign.stats.sent / campaign.stats.total) * 100 : 0;
                    return (
                      <tr key={campaign.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/crm/communications/${campaign.id}`} className="text-sm font-semibold text-gray-900 hover:text-oecs-navy-blue transition-colors">
                            {campaign.name}
                          </Link>
                          <div className="text-xs text-gray-400 mt-0.5">{campaign.subject}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {campaign.segment_name || <span className="text-gray-300">None</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            <Icon icon={badge.icon} className="w-3.5 h-3.5" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {campaign.stats.total > 0 ? (
                            <div>
                              <div className="text-gray-600">
                                <span className="text-emerald-600 font-medium">{campaign.stats.sent}</span>
                                <span className="text-gray-400 mx-0.5">/</span>
                                <span>{campaign.stats.total}</span>
                                <span className="text-gray-400 text-xs ml-1">sent</span>
                                {campaign.stats.failed > 0 && (
                                  <span className="text-red-500 text-xs ml-1.5">({campaign.stats.failed} failed)</span>
                                )}
                              </div>
                              <div className="mt-1.5 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${sentRatio}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {campaign.sent_at
                            ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()}`
                            : campaign.scheduled_for
                              ? `Scheduled ${new Date(campaign.scheduled_for).toLocaleDateString()}`
                              : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/crm/communications/${campaign.id}`}
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-none text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
