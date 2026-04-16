'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_by_name: string | null;
  criteria: any[];
  logic: string;
  member_count: number;
  last_calculated_at: string | null;
  is_dynamic: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  student_id: string;
  name: string;
  email: string;
  added_at: string;
}

interface FilterCriterion {
  field: string;
  operator: string;
  value: string;
}

const ACCENT_COLORS = [
  'border-l-violet-400', 'border-l-blue-400', 'border-l-emerald-400', 'border-l-amber-400',
  'border-l-rose-400', 'border-l-indigo-400', 'border-l-cyan-400', 'border-l-pink-400',
];

const FILTER_FIELDS = [
  { value: 'lifecycle_stage', label: 'Lifecycle Stage', operators: ['eq', 'neq', 'in'], valueType: 'select' as const, options: ['prospect', 'onboarding', 'active', 'at_risk', 're_engagement', 'completing', 'alumni'] },
  { value: 'risk_level', label: 'Risk Level', operators: ['eq', 'neq', 'in'], valueType: 'select' as const, options: ['low', 'medium', 'high', 'critical'] },
  { value: 'engagement_score', label: 'Engagement Score', operators: ['gt', 'lt', 'gte', 'lte', 'eq'], valueType: 'number' as const },
  { value: 'enrollment_status', label: 'Enrollment Status', operators: ['eq', 'neq'], valueType: 'select' as const, options: ['enrolled', 'completed', 'dropped'] },
  { value: 'course_id', label: 'Enrolled in Course', operators: ['eq'], valueType: 'text' as const },
  { value: 'last_active_days_ago', label: 'Last Active (Days Ago)', operators: ['gt', 'lt', 'gte', 'lte'], valueType: 'number' as const },
  { value: 'gender', label: 'Gender', operators: ['eq', 'neq'], valueType: 'select' as const, options: ['male', 'female', 'other'] },
];

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'equals', neq: 'not equals', gt: 'greater than', lt: 'less than',
  gte: 'at least', lte: 'at most', in: 'is one of', like: 'contains',
};

const OPERATOR_SYMBOLS: Record<string, string> = {
  eq: '=', neq: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=', in: 'in', like: 'contains',
};

export default function CRMSegmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createLogic, setCreateLogic] = useState<'AND' | 'OR'>('AND');
  const [createShared, setCreateShared] = useState(false);
  const [createCriteria, setCreateCriteria] = useState<FilterCriterion[]>([
    { field: 'lifecycle_stage', operator: 'eq', value: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [createError, setCreateError] = useState('');

  // Detail modal state
  const [detailSegment, setDetailSegment] = useState<Segment | null>(null);
  const [detailMembers, setDetailMembers] = useState<Member[]>([]);
  const [detailMemberTotal, setDetailMemberTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEvaluating, setDetailEvaluating] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const detailLimit = 50;

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/segments?limit=100');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        return;
      }
      const data = await res.json();
      setSegments(data.segments || []);
    } catch (error) {
      console.error('CRM Segments: Error', error);
      showToast('Failed to load segments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (segmentId: string) => {
    try {
      setEvaluatingId(segmentId);
      const res = await fetch(`/api/crm/segments/${segmentId}/evaluate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSegments(prev =>
          prev.map(s =>
            s.id === segmentId
              ? { ...s, member_count: data.member_count, last_calculated_at: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (error) {
      console.error('CRM Segment Evaluate: Error', error);
      showToast('Failed to evaluate segment', 'error');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleDelete = async (segmentId: string, name: string) => {
    if (!confirm(`Delete segment "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/crm/segments/${segmentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSegments(prev => prev.filter(s => s.id !== segmentId));
        if (detailSegment?.id === segmentId) setDetailSegment(null);
      }
    } catch (error) {
      console.error('CRM Segment Delete: Error', error);
      showToast('Failed to delete segment', 'error');
    }
  };

  // --- Create modal logic ---
  const resetCreateForm = () => {
    setCreateName('');
    setCreateDesc('');
    setCreateLogic('AND');
    setCreateShared(false);
    setCreateCriteria([{ field: 'lifecycle_stage', operator: 'eq', value: '' }]);
    setCreateError('');
    setPreviewCount(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const addCriterion = () => {
    setCreateCriteria(prev => [...prev, { field: 'lifecycle_stage', operator: 'eq', value: '' }]);
  };

  const removeCriterion = (index: number) => {
    setCreateCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, updates: Partial<FilterCriterion>) => {
    setCreateCriteria(prev =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        if (updates.field && updates.field !== c.field) {
          const fieldDef = FILTER_FIELDS.find(f => f.value === updates.field);
          updated.operator = fieldDef?.operators[0] || 'eq';
          updated.value = '';
        }
        return updated;
      })
    );
    setPreviewCount(null);
  };

  const getFieldDef = (fieldValue: string) => FILTER_FIELDS.find(f => f.value === fieldValue);

  const handlePreview = async () => {
    const validCriteria = createCriteria.filter(c => c.value !== '');
    if (validCriteria.length === 0) {
      setCreateError('Add at least one filter criterion with a value.');
      return;
    }
    try {
      setPreviewing(true);
      setCreateError('');
      const createRes = await fetch('/api/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `_preview_${Date.now()}`, criteria: validCriteria, logic: createLogic }),
      });
      if (!createRes.ok) { setCreateError('Failed to preview segment.'); return; }
      const { segment } = await createRes.json();
      const evalRes = await fetch(`/api/crm/segments/${segment.id}/evaluate`, { method: 'POST' });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setPreviewCount(evalData.member_count);
      }
      await fetch(`/api/crm/segments/${segment.id}`, { method: 'DELETE' });
    } catch {
      setCreateError('Failed to preview segment.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!createName.trim()) { setCreateError('Segment name is required.'); return; }
    const validCriteria = createCriteria.filter(c => c.value !== '');
    if (validCriteria.length === 0) { setCreateError('Add at least one filter criterion with a value.'); return; }

    try {
      setSaving(true);
      setCreateError('');
      const res = await fetch('/api/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || null,
          criteria: validCriteria,
          logic: createLogic,
          is_shared: createShared,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create segment.');
        return;
      }
      const { segment } = await res.json();
      await fetch(`/api/crm/segments/${segment.id}/evaluate`, { method: 'POST' });
      showToast('Segment created successfully', 'success');
      setShowCreateModal(false);
      fetchSegments();
    } catch {
      setCreateError('Failed to create segment.');
    } finally {
      setSaving(false);
    }
  };

  // --- Detail modal logic ---
  const openDetailModal = async (segmentId: string) => {
    setDetailLoading(true);
    setDetailSearch('');
    setDetailPage(1);
    setDetailSegment(null);
    setDetailMembers([]);
    try {
      const res = await fetch(`/api/crm/segments/${segmentId}?include_members=true&page=1&limit=${detailLimit}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetailSegment(data.segment);
      setDetailMembers(data.members || []);
      setDetailMemberTotal(data.member_total || 0);
    } catch (error) {
      console.error('Segment detail: Error', error);
      showToast('Failed to load segment details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchDetailMembers = useCallback(async (segId: string, pg: number) => {
    try {
      const res = await fetch(`/api/crm/segments/${segId}?include_members=true&page=${pg}&limit=${detailLimit}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetailMembers(data.members || []);
      setDetailMemberTotal(data.member_total || 0);
    } catch (error) {
      console.error('Segment members: Error', error);
    }
  }, []);

  const handleDetailEvaluate = async () => {
    if (!detailSegment) return;
    try {
      setDetailEvaluating(true);
      const res = await fetch(`/api/crm/segments/${detailSegment.id}/evaluate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDetailSegment(prev => prev ? { ...prev, member_count: data.member_count, last_calculated_at: new Date().toISOString() } : null);
        setDetailPage(1);
        fetchDetailMembers(detailSegment.id, 1);
        // Also update list
        setSegments(prev => prev.map(s => s.id === detailSegment.id ? { ...s, member_count: data.member_count, last_calculated_at: new Date().toISOString() } : s));
      }
    } catch (error) {
      console.error('Segment evaluate: Error', error);
      showToast('Failed to evaluate segment', 'error');
    } finally {
      setDetailEvaluating(false);
    }
  };

  const detailFilteredMembers = detailSearch
    ? detailMembers.filter(m =>
        m.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(detailSearch.toLowerCase())
      )
    : detailMembers;

  const detailTotalPages = Math.ceil(detailMemberTotal / detailLimit);

  const filteredSegments = searchTerm
    ? segments.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : segments;

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-10 w-36 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 mb-6 shadow-sm">
            <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border border-gray-100 bg-white shadow-sm p-5 border-l-4 border-l-gray-200">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                  <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Segments</h1>
            <span className="text-sm text-gray-400 font-medium">({filteredSegments.length})</span>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-900 text-white rounded-lg transition-all duration-300 text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Segment
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="relative">
            <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>
        </div>

        {/* Segments Grid */}
        {filteredSegments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon icon="mdi:account-group-outline" className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-2">No Segments Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
              Create segments to group students by criteria like risk level, engagement, or lifecycle stage.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-900 text-white rounded-lg transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Create Your First Segment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSegments.map((segment, idx) => (
              <div
                key={segment.id}
                className={`bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${ACCENT_COLORS[idx % ACCENT_COLORS.length]} hover:-translate-y-0.5`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => openDetailModal(segment.id)}
                        className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block transition-colors duration-200 text-left"
                      >
                        {segment.name}
                      </button>
                      {segment.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {segment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {segment.is_shared && (
                        <span className="text-blue-500" title="Shared">
                          <Icon icon="mdi:share-variant" className="w-4 h-4" />
                        </span>
                      )}
                      {segment.is_dynamic && (
                        <span className="text-amber-500" title="Dynamic">
                          <Icon icon="mdi:refresh" className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(segment.criteria || []).slice(0, 3).map((c: any, i: number) => (
                      <span key={i} className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {c.field} {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                      </span>
                    ))}
                    {(segment.criteria || []).length > 3 && (
                      <span className="inline-flex px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-medium">
                        +{segment.criteria.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Icon icon="mdi:account-multiple" className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{segment.member_count}</span> members
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => openDetailModal(segment.id)}
                      className="flex-1 px-3 py-1.5 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      View Members
                    </button>
                    <button
                      onClick={() => handleEvaluate(segment.id)}
                      disabled={evaluatingId === segment.id}
                      className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                      title="Recalculate members"
                    >
                      {evaluatingId === segment.id ? (
                        <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon icon="mdi:refresh" className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(segment.id, segment.name)}
                      className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete segment"
                    >
                      <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== CREATE SEGMENT MODAL ===== */}
      <AccessibleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Segment"
        size="full"
      >
            <div className="space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Segment Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g., At-Risk Students in CS101"
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Describe the purpose of this segment..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none resize-none"
                  />
                </div>
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createShared}
                    onChange={(e) => setCreateShared(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4"
                  />
                  Share with all staff
                </label>
              </div>

              {/* Filter Criteria */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Filter Criteria</h3>
                  <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                    <button
                      onClick={() => { setCreateLogic('AND'); setPreviewCount(null); }}
                      className={`px-3 py-1 rounded-full font-semibold text-xs transition-all ${
                        createLogic === 'AND' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >ALL (AND)</button>
                    <button
                      onClick={() => { setCreateLogic('OR'); setPreviewCount(null); }}
                      className={`px-3 py-1 rounded-full font-semibold text-xs transition-all ${
                        createLogic === 'OR' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >ANY (OR)</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {createCriteria.map((criterion, index) => {
                    const fieldDef = getFieldDef(criterion.field);
                    return (
                      <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <select
                          value={criterion.field}
                          onChange={(e) => updateCriterion(index, { field: e.target.value })}
                          className="px-2 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm min-w-0 sm:min-w-[140px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                          {FILTER_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select
                          value={criterion.operator}
                          onChange={(e) => updateCriterion(index, { operator: e.target.value })}
                          className="px-2 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm min-w-0 sm:min-w-[100px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                          {(fieldDef?.operators || ['eq']).map(op => <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>)}
                        </select>
                        {fieldDef?.valueType === 'select' ? (
                          <select
                            value={criterion.value}
                            onChange={(e) => updateCriterion(index, { value: e.target.value })}
                            className="flex-1 px-2 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          >
                            <option value="">Select...</option>
                            {(fieldDef.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fieldDef?.valueType === 'number' ? 'number' : 'text'}
                            value={criterion.value}
                            onChange={(e) => updateCriterion(index, { value: e.target.value })}
                            placeholder={fieldDef?.valueType === 'number' ? 'Value...' : 'Enter value...'}
                            className="flex-1 px-2 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          />
                        )}
                        {createCriteria.length > 1 && (
                          <button onClick={() => removeCriterion(index)} className="px-2 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Icon icon="mdi:close" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button onClick={addCriterion} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all mt-3">
                  <Icon icon="mdi:plus" className="w-4 h-4" />
                  Add Filter
                </button>
              </div>

              {/* Preview & Save */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={previewing}
                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {previewing ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:eye-outline" className="w-4 h-4" />}
                    Preview
                  </button>
                  {previewCount !== null && (
                    <span className="text-sm text-gray-500">
                      <span className="font-bold text-gray-900">{previewCount}</span> students match
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-900 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {saving ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:content-save" className="w-4 h-4" />}
                  Create Segment
                </button>
              </div>
            </div>
      </AccessibleModal>

      {/* ===== DETAIL SEGMENT MODAL ===== */}
      <AccessibleModal
        isOpen={!!(detailSegment || detailLoading)}
        onClose={() => { setDetailSegment(null); setDetailLoading(false); }}
        title={detailSegment?.name || 'Segment Details'}
        description={detailSegment?.description || undefined}
        size="full"
      >
            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="text-gray-500 mt-4 text-sm">Loading segment details...</p>
              </div>
            ) : detailSegment && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={handleDetailEvaluate}
                    disabled={detailEvaluating}
                    className="px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {detailEvaluating ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:refresh" className="w-4 h-4" />}
                    Recalculate
                  </button>
                  <button
                    onClick={() => { handleDelete(detailSegment.id, detailSegment.name); }}
                    className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  {/* Info Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{detailSegment.member_count}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Criteria</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{(detailSegment.criteria || []).length}</div>
                      <div className="text-xs text-gray-400">{detailSegment.logic}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</div>
                      <div className="text-sm font-bold text-gray-900 mt-1.5">{detailSegment.is_dynamic ? 'Dynamic' : 'Static'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Calculated</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1.5">
                        {detailSegment.last_calculated_at ? new Date(detailSegment.last_calculated_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  </div>

                  {/* Criteria */}
                  <div className="mb-5">
                    <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Filter Criteria</h3>
                    <div className="flex flex-wrap gap-2">
                      {(detailSegment.criteria || []).map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-xs font-bold text-blue-600 px-1">{detailSegment.logic}</span>}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-sm border border-blue-100">
                            <span className="font-semibold text-blue-700">{c.field.replace(/_/g, ' ')}</span>
                            <span className="text-gray-400">{OPERATOR_SYMBOLS[c.operator] || c.operator}</span>
                            <span className="font-semibold text-blue-600">{Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">Members ({detailMemberTotal})</h3>
                      <div className="relative w-56">
                        <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={detailSearch}
                          onChange={(e) => setDetailSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailFilteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">
                              {detailSearch ? 'No members match your search.' : 'No members yet. Click "Recalculate" to evaluate criteria.'}
                            </td>
                          </tr>
                        ) : (
                          detailFilteredMembers.map(member => (
                            <tr key={member.student_id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 bg-gradient-to-br from-blue-700 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{member.email}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{new Date(member.added_at).toLocaleDateString()}</td>
                              <td className="px-4 py-2.5 text-right">
                                <Link
                                  href={`/crm/students/${member.student_id}`}
                                  className="text-blue-600 hover:text-blue-900 text-sm font-semibold"
                                >
                                  View 360
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>

                    {detailTotalPages > 1 && (
                      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-400 font-medium">Page {detailPage} of {detailTotalPages}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { const p = Math.max(1, detailPage - 1); setDetailPage(p); fetchDetailMembers(detailSegment.id, p); }}
                            disabled={detailPage === 1}
                            className="px-3 py-1 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                          >Previous</button>
                          <button
                            onClick={() => { const p = Math.min(detailTotalPages, detailPage + 1); setDetailPage(p); fetchDetailMembers(detailSegment.id, p); }}
                            disabled={detailPage === detailTotalPages}
                            className="px-3 py-1 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                          >Next</button>
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
