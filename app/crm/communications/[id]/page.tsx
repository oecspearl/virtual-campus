'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  segment_id: string | null;
  segment_name: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_by_name: string | null;
  stats: { total: number; sent: number; failed: number; opened: number; clicked: number };
  created_at: string;
  metadata?: { campaign_type?: string; programme_id?: string };
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  programme_title: string | null;
}

interface Recipient {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  error_message: string | null;
}

const RECIPIENT_STATUS_COLORS: Record<string, { text: string; dot: string }> = {
  pending: { text: 'text-gray-500', dot: 'bg-gray-400' },
  sent: { text: 'text-blue-600', dot: 'bg-blue-500' },
  delivered: { text: 'text-green-600', dot: 'bg-green-500' },
  opened: { text: 'text-emerald-600', dot: 'bg-emerald-500' },
  clicked: { text: 'text-oecs-navy-blue', dot: 'bg-oecs-navy-blue' },
  bounced: { text: 'text-orange-600', dot: 'bg-orange-500' },
  failed: { text: 'text-red-600', dot: 'bg-red-500' },
};

const RECIPIENT_LIMIT = 20;

function SkeletonDetail() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse mb-2" />
              <div className="h-7 w-56 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse mt-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-12 bg-gray-200 rounded-lg animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* Skeleton Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="px-6 py-3 text-left">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3"><div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-16 bg-gray-200 rounded-lg animate-pulse" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-28 bg-gray-100 rounded-lg animate-pulse" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-20 bg-gray-100 rounded-lg animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recipientPage, setRecipientPage] = useState(1);
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign) {
      fetchRecipients();
    }
  }, [recipientPage]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/campaigns/${id}?include_recipients=true&page=1&limit=${RECIPIENT_LIMIT}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; }
        if (res.status === 404) { router.push('/crm/communications'); return; }
        return;
      }
      const data = await res.json();
      setCampaign(data.campaign);
      setRecipients(data.recipients || []);
      setRecipientTotal(data.recipient_total || 0);
      setRecipientPage(1);

      // Fetch application stats if this is an application campaign
      if (data.campaign?.metadata?.campaign_type === 'application') {
        fetchApplicationStats(data.campaign.id);
      }
    } catch (error) {
      console.error('CRM Campaign Detail: Error', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStats = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/crm/applications?campaign_id=${campaignId}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        // Compute stats from the total counts returned
        setAppStats({
          total: data.total || 0,
          pending: data.status_counts?.pending || 0,
          approved: data.status_counts?.approved || 0,
          rejected: data.status_counts?.rejected || 0,
          waitlisted: data.status_counts?.waitlisted || 0,
          programme_title: data.programme_title || null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch application stats:', error);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await fetch(`/api/crm/campaigns/${id}?include_recipients=true&page=${recipientPage}&limit=${RECIPIENT_LIMIT}`);
      if (!res.ok) return;
      const data = await res.json();
      setRecipients(data.recipients || []);
      setRecipientTotal(data.recipient_total || 0);
    } catch (error) {
      console.error('CRM Recipients fetch error:', error);
    }
  };

  const handleSend = async () => {
    if (!confirm('Send this campaign now? This action cannot be undone.')) return;

    try {
      setSending(true);
      const res = await fetch(`/api/crm/campaigns/${id}/send`, { method: 'POST' });
      if (res.ok) {
        showToast('Campaign sent successfully', 'success');
        fetchCampaign();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to send campaign', 'error');
      }
    } catch (error) {
      console.error('Send error:', error);
      showToast('Failed to send campaign', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/crm/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/crm/communications');
      } else {
        showToast('Failed to delete campaign', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete campaign', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !campaign) {
    return <SkeletonDetail />;
  }

  const recipientTotalPages = Math.max(1, Math.ceil(recipientTotal / RECIPIENT_LIMIT));
  const recipientStart = recipientTotal === 0 ? 0 : (recipientPage - 1) * RECIPIENT_LIMIT + 1;
  const recipientEnd = Math.min(recipientPage * RECIPIENT_LIMIT, recipientTotal);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
              <Link href="/crm/communications" className="hover:text-gray-600 transition-colors">Communications</Link>
              <Icon icon="mdi:chevron-right" className="w-4 h-4" />
              <span className="text-gray-600">{campaign.name}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{campaign.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            {['draft', 'scheduled'].includes(campaign.status) && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2.5 bg-oecs-navy-blue text-white rounded-xl hover:bg-blue-900 transition-all duration-300 text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                {sending ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:send" className="w-4 h-4" />}
                Send Now
              </button>
            )}
            {['draft', 'scheduled'].includes(campaign.status) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {deleting && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-oecs-navy-blue p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{campaign.stats.total}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-emerald-500 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sent</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{campaign.stats.sent}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-red-500 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Failed</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{campaign.stats.failed}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-amber-500 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</div>
            <div className="text-lg font-bold text-gray-900 mt-1 capitalize">{campaign.status}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-blue-500 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Segment</div>
            <div className="text-sm font-semibold text-gray-900 mt-2">{campaign.segment_name || 'None'}</div>
          </div>
        </div>

        {/* Application Stats (for application campaigns) */}
        {campaign.metadata?.campaign_type === 'application' && appStats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <Icon icon="mdi:clipboard-text-outline" className="w-5 h-5 text-purple-500" />
                Applications
                {appStats.programme_title && (
                  <span className="text-sm font-normal text-gray-400">for {appStats.programme_title}</span>
                )}
              </h2>
              <Link
                href={`/crm/applications?campaign_id=${campaign.id}`}
                className="text-sm text-oecs-navy-blue hover:text-blue-900 font-medium flex items-center gap-1 transition-colors"
              >
                View All
                <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{appStats.total}</div>
                <div className="text-xs text-gray-500 font-medium">Total</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{appStats.pending}</div>
                <div className="text-xs text-amber-600 font-medium">Pending</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{appStats.approved}</div>
                <div className="text-xs text-emerald-600 font-medium">Approved</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-red-600">{appStats.rejected}</div>
                <div className="text-xs text-red-600 font-medium">Rejected</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{appStats.waitlisted}</div>
                <div className="text-xs text-blue-600 font-medium">Waitlisted</div>
              </div>
            </div>
          </div>
        )}

        {/* Email Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:email-open-outline" className="w-5 h-5 text-gray-400" />
              Email Preview
            </h2>
            <Icon
              icon={showPreview ? 'mdi:chevron-up' : 'mdi:chevron-down'}
              className="w-5 h-5 text-gray-400"
            />
          </button>
          {showPreview && (
            <div className="p-6 bg-gray-50">
              <div
                className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto"
                dangerouslySetInnerHTML={{ __html: campaign.body_html }}
              />
            </div>
          )}
        </div>

        {/* Recipients Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:account-group-outline" className="w-5 h-5 text-gray-400" />
              Recipients ({recipientTotal})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <Icon icon="mdi:account-multiple-outline" className="w-8 h-8 text-oecs-navy-blue" />
                        </div>
                        <p className="text-gray-600 font-medium">
                          {campaign.status === 'draft' ? 'Recipients will appear after the campaign is sent' : 'No recipients'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          {campaign.status === 'draft' ? 'Send the campaign to populate this list.' : 'There are no recipients for this campaign.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recipients.map(r => {
                    const statusStyle = RECIPIENT_STATUS_COLORS[r.status] || { text: 'text-gray-500', dot: 'bg-gray-400' };
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          <Link href={`/crm/students/${r.student_id}`} className="text-oecs-navy-blue hover:text-blue-900 font-semibold transition-colors">
                            {r.student_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">{r.email}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium capitalize ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-400">
                          {r.sent_at ? new Date(r.sent_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-3 text-xs text-red-500">{r.error_message || ''}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Recipient Pagination */}
          {recipientTotal > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Showing {recipientStart}-{recipientEnd} of {recipientTotal}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setRecipientPage(p => Math.max(1, p - 1))}
                  disabled={recipientPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">Page {recipientPage} of {recipientTotalPages}</span>
                <button
                  onClick={() => setRecipientPage(p => Math.min(recipientTotalPages, p + 1))}
                  disabled={recipientPage === recipientTotalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
