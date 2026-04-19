'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

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

interface Segment { id: string; name: string; member_count: number; }
interface Programme { id: string; title: string; }
interface FormField {
  id: string;
  type: 'text' | 'essay' | 'multiple_choice' | 'multiple_select' | 'rating_scale';
  question_text: string;
  description: string;
  required: boolean;
  options: any;
}
interface Recipient {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: 'mdi:file-edit-outline' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700', icon: 'mdi:clock-outline' },
  sending: { label: 'Sending', color: 'bg-amber-50 text-amber-700', icon: 'mdi:send-clock' },
  sent: { label: 'Sent', color: 'bg-emerald-50 text-emerald-700', icon: 'mdi:check-circle-outline' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', icon: 'mdi:alert-circle-outline' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: 'mdi:cancel' },
};

const RECIPIENT_STATUS_COLORS: Record<string, { text: string; dot: string }> = {
  pending: { text: 'text-gray-500', dot: 'bg-gray-400' },
  sent: { text: 'text-blue-600', dot: 'bg-blue-500' },
  delivered: { text: 'text-green-600', dot: 'bg-green-500' },
  opened: { text: 'text-emerald-600', dot: 'bg-emerald-500' },
  clicked: { text: 'text-blue-600', dot: 'bg-blue-600' },
  bounced: { text: 'text-orange-600', dot: 'bg-orange-500' },
  failed: { text: 'text-red-600', dot: 'bg-red-500' },
};

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'essay', label: 'Long Text / Essay' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'rating_scale', label: 'Rating Scale' },
];

const LIMIT = 50;
const RECIPIENT_LIMIT = 20;

function generateId() { return 'field_' + Math.random().toString(36).slice(2, 9); }

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

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [createSegmentId, setCreateSegmentId] = useState('');
  const [createSchedule, setCreateSchedule] = useState('');
  const [createType, setCreateType] = useState<'broadcast' | 'application'>('broadcast');
  const [createProgrammeId, setCreateProgrammeId] = useState('');
  const [createFields, setCreateFields] = useState<FormField[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Detail modal state
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecipients, setDetailRecipients] = useState<Recipient[]>([]);
  const [detailRecipientTotal, setDetailRecipientTotal] = useState(0);
  const [detailRecipientPage, setDetailRecipientPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchCampaigns(); }, [statusFilter, page, searchTerm]);

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setSearchTerm(value); setPage(1); }, 300);
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

  // --- Create modal ---
  const openCreateModal = async () => {
    setCreateName(''); setCreateSubject(''); setCreateBody('');
    setCreateSegmentId(''); setCreateSchedule('');
    setCreateType('broadcast'); setCreateProgrammeId('');
    setCreateFields([]); setCreateError('');
    setShowCreate(true);
    // Fetch segments and programmes
    try {
      const [segRes, progRes] = await Promise.all([
        fetch('/api/crm/segments?limit=100'),
        fetch('/api/programmes?limit=100'),
      ]);
      if (segRes.ok) { const d = await segRes.json(); setSegments(d.segments || []); }
      if (progRes.ok) { const d = await progRes.json(); setProgrammes(d.programmes || []); }
    } catch { /* silent */ }
  };

  const addField = () => {
    setCreateFields(prev => [...prev, { id: generateId(), type: 'text', question_text: '', description: '', required: true, options: null }]);
  };
  const updateField = (id: string, updates: Partial<FormField>) => {
    setCreateFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  const removeField = (id: string) => { setCreateFields(prev => prev.filter(f => f.id !== id)); };
  const moveField = (id: string, dir: 'up' | 'down') => {
    setCreateFields(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const handleCreateSave = async (sendImmediately = false) => {
    if (!createName.trim() || !createSubject.trim() || !createBody.trim()) { setCreateError('Name, subject, and body are required.'); return; }
    if (!createSegmentId) { setCreateError('Please select a target segment.'); return; }
    if (createType === 'application') {
      if (!createProgrammeId) { setCreateError('Please select a programme.'); return; }
      if (createFields.length === 0) { setCreateError('Add at least one application form field.'); return; }
      if (createFields.some(f => !f.question_text.trim())) { setCreateError('All form fields must have a question.'); return; }
    }

    try {
      setSaving(true); setCreateError('');
      const metadata = createType === 'application' ? { campaign_type: 'application', programme_id: createProgrammeId } : {};
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(), subject: createSubject.trim(), body_html: createBody,
          segment_id: createSegmentId, scheduled_for: createSchedule || null, metadata,
        }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || 'Failed to create campaign.'); return; }
      const { campaign } = await res.json();

      if (createType === 'application' && createFields.length > 0) {
        await fetch(`/api/crm/campaigns/${campaign.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: createFields.map((f, idx) => ({
              type: f.type, question_text: f.question_text, description: f.description || null,
              order: idx, required: f.required, options: f.options,
            })),
          }),
        });
      }

      if (sendImmediately) {
        await fetch(`/api/crm/campaigns/${campaign.id}/send`, { method: 'POST' });
        showToast('Campaign created and sent', 'success');
      } else {
        showToast('Campaign created', 'success');
      }
      setShowCreate(false);
      fetchCampaigns();
    } catch {
      setCreateError('Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  // --- Detail modal ---
  const openDetailModal = async (campaignId: string) => {
    setDetailLoading(true);
    setDetailCampaign(null); setDetailRecipients([]);
    setDetailRecipientTotal(0); setDetailRecipientPage(1);
    setShowPreview(false);
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}?include_recipients=true&page=1&limit=${RECIPIENT_LIMIT}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetailCampaign(data.campaign);
      setDetailRecipients(data.recipients || []);
      setDetailRecipientTotal(data.recipient_total || 0);
    } catch (error) {
      console.error('Campaign detail error:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchDetailRecipients = async (pg: number) => {
    if (!detailCampaign) return;
    try {
      const res = await fetch(`/api/crm/campaigns/${detailCampaign.id}?include_recipients=true&page=${pg}&limit=${RECIPIENT_LIMIT}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetailRecipients(data.recipients || []);
      setDetailRecipientTotal(data.recipient_total || 0);
    } catch { /* silent */ }
  };

  const handleSendCampaign = async () => {
    if (!detailCampaign || !confirm('Send this campaign now?')) return;
    try {
      setSending(true);
      const res = await fetch(`/api/crm/campaigns/${detailCampaign.id}/send`, { method: 'POST' });
      if (res.ok) {
        showToast('Campaign sent', 'success');
        openDetailModal(detailCampaign.id);
        fetchCampaigns();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to send', 'error');
      }
    } catch { showToast('Failed to send campaign', 'error'); }
    finally { setSending(false); }
  };

  const handleDeleteCampaign = async () => {
    if (!detailCampaign || !confirm('Delete this campaign?')) return;
    try {
      const res = await fetch(`/api/crm/campaigns/${detailCampaign.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDetailCampaign(null);
        fetchCampaigns();
        showToast('Campaign deleted', 'success');
      }
    } catch { showToast('Failed to delete campaign', 'error'); }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);
  const detailRecipientTotalPages = Math.max(1, Math.ceil(detailRecipientTotal / RECIPIENT_LIMIT));
  const selectedSegment = segments.find(s => s.id === createSegmentId);

  if (loading) {
    return (
      <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex gap-2">{[...Array(7)].map((_, i) => <div key={i} className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full"><tbody className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <tr key={i}><td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded-lg animate-pulse" /></td>
                <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse" /></td>
                <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
                <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-100 rounded-lg animate-pulse" /></td></tr>
              ))}
            </tbody></table>
          </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Communications</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <button onClick={() => setStatusFilter('')} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${!statusFilter ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
              {Object.entries(STATUS_BADGES).map(([key, { label }]) => (
                <button key={key} onClick={() => setStatusFilter(key)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
              ))}
            </div>
            <div className="relative">
              <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search campaigns..." defaultValue={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none w-56" />
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
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
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 mx-auto">
                        <Icon icon="mdi:email-outline" className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-gray-600 font-medium">No campaigns yet</p>
                      <button onClick={openCreateModal} className="text-blue-600 hover:text-blue-900 font-semibold text-sm mt-3 inline-flex items-center gap-1">
                        <Icon icon="mdi:plus-circle-outline" className="w-4 h-4" /> Create your first campaign
                      </button>
                    </td>
                  </tr>
                ) : campaigns.map(campaign => {
                  const badge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft;
                  const sentRatio = campaign.stats.total > 0 ? (campaign.stats.sent / campaign.stats.total) * 100 : 0;
                  return (
                    <tr key={campaign.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => openDetailModal(campaign.id)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left">
                          {campaign.name}
                        </button>
                        <div className="text-xs text-gray-400 mt-0.5">{campaign.subject}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{campaign.segment_name || <span className="text-gray-300">None</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          <Icon icon={badge.icon} className="w-3.5 h-3.5" /> {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {campaign.stats.total > 0 ? (
                          <div>
                            <span className="text-emerald-600 font-medium">{campaign.stats.sent}</span>
                            <span className="text-gray-400 mx-0.5">/</span>{campaign.stats.total}
                            <span className="text-gray-400 text-xs ml-1">sent</span>
                            <div className="mt-1 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sentRatio}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-gray-300 text-xs">--</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {campaign.sent_at ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()}`
                          : campaign.scheduled_for ? `Scheduled ${new Date(campaign.scheduled_for).toLocaleDateString()}`
                          : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openDetailModal(campaign.id)} className="text-blue-600 hover:text-blue-900 font-semibold text-sm">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">Showing {start}-{end} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

      {/* ===== CREATE CAMPAIGN MODAL ===== */}
      <AccessibleModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Campaign"
        size="full"
      >
            <div className="space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" /> {createError}
                </div>
              )}

              {/* Campaign Type */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setCreateType('broadcast')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${createType === 'broadcast' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:bullhorn-outline" className={`w-5 h-5 ${createType === 'broadcast' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold text-sm ${createType === 'broadcast' ? 'text-blue-600' : 'text-gray-700'}`}>Broadcast</span>
                  </div>
                  <p className="text-xs text-gray-500">Send an informational email.</p>
                </button>
                <button type="button" onClick={() => setCreateType('application')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${createType === 'application' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon="mdi:clipboard-text-outline" className={`w-5 h-5 ${createType === 'application' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold text-sm ${createType === 'application' ? 'text-blue-600' : 'text-gray-700'}`}>Application</span>
                  </div>
                  <p className="text-xs text-gray-500">Invite students to apply for a programme.</p>
                </button>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                  <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., Welcome Back - Spring 2026"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Segment *</label>
                  <select value={createSegmentId} onChange={(e) => setCreateSegmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm">
                    <option value="">Select a segment...</option>
                    {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.member_count} members)</option>)}
                  </select>
                  {selectedSegment && <p className="text-xs text-gray-500 mt-1">Will be sent to {selectedSegment.member_count} students.</p>}
                </div>
                {createType === 'application' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Programme *</label>
                    <select value={createProgrammeId} onChange={(e) => setCreateProgrammeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm">
                      <option value="">Select a programme...</option>
                      {programmes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Email Content</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line *</label>
                  <input type="text" value={createSubject} onChange={(e) => setCreateSubject(e.target.value)} placeholder="e.g., Important update about your courses"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Use {'{{student_name}}'} and {'{{student_email}}'} for personalization.
                    {createType === 'application' && <> Use {'{{application_link}}'} for the form link.</>}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body (HTML) *</label>
                  <textarea value={createBody} onChange={(e) => setCreateBody(e.target.value)} rows={8}
                    placeholder={createType === 'application'
                      ? '<h2>Hello {{student_name}},</h2>\n<p>You are invited to apply!</p>\n<p><a href="{{application_link}}">Apply here</a></p>'
                      : '<h2>Hello {{student_name}},</h2>\n<p>We wanted to reach out about...</p>'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none font-mono text-sm" />
                </div>
              </div>

              {/* Application Form Fields */}
              {createType === 'application' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Application Form Fields</h3>
                    <button type="button" onClick={addField} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-blue-700">
                      <Icon icon="mdi:plus" className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>
                  {createFields.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">No fields yet. Click &quot;Add Field&quot; to start.</div>
                  ) : (
                    <div className="space-y-2">
                      {createFields.map((field, index) => (
                        <div key={field.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center">{index + 1}</span>
                              <select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'], options: null })}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none">
                                {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button type="button" onClick={() => moveField(field.id, 'up')} disabled={index === 0} className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-30"><Icon icon="mdi:arrow-up" className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => moveField(field.id, 'down')} disabled={index === createFields.length - 1} className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-30"><Icon icon="mdi:arrow-down" className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeField(field.id)} className="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-600"><Icon icon="mdi:trash-can-outline" className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <input type="text" value={field.question_text} onChange={(e) => updateField(field.id, { question_text: e.target.value })} placeholder="Question..."
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm placeholder-gray-400 outline-none mb-1" />
                          {(field.type === 'multiple_choice' || field.type === 'multiple_select') && (
                            <textarea value={(field.options?.choices || []).join('\n')} onChange={(e) => updateField(field.id, { options: { choices: e.target.value.split('\n').filter(Boolean) } })}
                              rows={2} placeholder="Option 1&#10;Option 2" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-mono outline-none" />
                          )}
                          <label className="flex items-center gap-2 mt-1 cursor-pointer">
                            <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                            <span className="text-xs text-gray-600">Required</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule (Optional)</label>
                <input type="datetime-local" value={createSchedule} onChange={(e) => setCreateSchedule(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm" />
                <p className="text-xs text-gray-400 mt-1">Leave empty to save as draft.</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button onClick={() => handleCreateSave(false)} disabled={saving}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
                  {createSchedule ? 'Schedule Campaign' : 'Save as Draft'}
                </button>
                <button onClick={() => handleCreateSave(true)} disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm">
                  {saving ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:send" className="w-4 h-4" />}
                  Send Now
                </button>
              </div>
            </div>
      </AccessibleModal>

      {/* ===== DETAIL CAMPAIGN MODAL ===== */}
      <AccessibleModal
        isOpen={!!(detailCampaign || detailLoading)}
        onClose={() => { setDetailCampaign(null); setDetailLoading(false); }}
        title={detailCampaign?.name || 'Campaign Details'}
        description={detailCampaign?.subject || undefined}
        size="full"
      >
            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="text-gray-500 mt-4 text-sm">Loading campaign details...</p>
              </div>
            ) : detailCampaign && (
              <>
                {['draft', 'scheduled'].includes(detailCampaign.status) && (
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={handleSendCampaign} disabled={sending}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
                      {sending ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:send" className="w-4 h-4" />} Send
                    </button>
                    <button onClick={handleDeleteCampaign} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50">Delete</button>
                  </div>
                )}

                <div>
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                    {[
                      { label: 'Total', value: detailCampaign.stats.total, color: 'border-t-blue-600' },
                      { label: 'Sent', value: detailCampaign.stats.sent, color: 'border-t-emerald-500' },
                      { label: 'Failed', value: detailCampaign.stats.failed, color: 'border-t-red-500' },
                      { label: 'Status', value: detailCampaign.status, color: 'border-t-amber-500', capitalize: true },
                      { label: 'Segment', value: detailCampaign.segment_name || 'None', color: 'border-t-blue-500' },
                    ].map(s => (
                      <div key={s.label} className={`bg-gray-50 rounded-lg p-3 border border-gray-100 border-t-2 ${s.color}`}>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</div>
                        <div className={`text-lg font-bold text-gray-900 mt-1 ${s.capitalize ? 'capitalize' : ''}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Email Preview */}
                  <div className="border border-gray-100 rounded-lg mb-5 overflow-hidden">
                    <button onClick={() => setShowPreview(!showPreview)} className="w-full p-3 flex items-center justify-between hover:bg-gray-50 bg-gray-50/50 border-b border-gray-100">
                      <span className="text-sm font-bold text-gray-900">Email Preview</span>
                      <Icon icon={showPreview ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-5 h-5 text-gray-400" />
                    </button>
                    {showPreview && (
                      <div className="p-4 bg-gray-50">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: detailCampaign.body_html }} />
                      </div>
                    )}
                  </div>

                  {/* Recipients */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">Recipients ({detailRecipientTotal})</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailRecipients.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">
                            {detailCampaign.status === 'draft' ? 'Recipients appear after sending.' : 'No recipients.'}
                          </td></tr>
                        ) : detailRecipients.map(r => {
                          const st = RECIPIENT_STATUS_COLORS[r.status] || { text: 'text-gray-500', dot: 'bg-gray-400' };
                          return (
                            <tr key={r.id} className="hover:bg-blue-50/30">
                              <td className="px-4 py-2.5 text-sm font-medium">
                                <Link href={`/crm/students/${r.student_id}`} className="text-blue-600 hover:text-blue-900 font-semibold">{r.student_name}</Link>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{r.email}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 text-sm font-medium capitalize ${st.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {r.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-400">{r.sent_at ? new Date(r.sent_at).toLocaleString() : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {detailRecipientTotal > RECIPIENT_LIMIT && (
                      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Page {detailRecipientPage} of {detailRecipientTotalPages}</span>
                        <div className="flex gap-2">
                          <button onClick={() => { const p = Math.max(1, detailRecipientPage - 1); setDetailRecipientPage(p); fetchDetailRecipients(p); }} disabled={detailRecipientPage === 1}
                            className="px-3 py-1 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Previous</button>
                          <button onClick={() => { const p = Math.min(detailRecipientTotalPages, detailRecipientPage + 1); setDetailRecipientPage(p); fetchDetailRecipients(p); }} disabled={detailRecipientPage === detailRecipientTotalPages}
                            className="px-3 py-1 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
      </AccessibleModal>
    </div>
  );
}
