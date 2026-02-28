'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface FilterCriterion {
  field: string;
  operator: string;
  value: string;
}

const FILTER_FIELDS = [
  { value: 'lifecycle_stage', label: 'Lifecycle Stage', operators: ['eq', 'neq', 'in'], valueType: 'select', options: ['prospect', 'onboarding', 'active', 'at_risk', 're_engagement', 'completing', 'alumni'] },
  { value: 'risk_level', label: 'Risk Level', operators: ['eq', 'neq', 'in'], valueType: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { value: 'engagement_score', label: 'Engagement Score', operators: ['gt', 'lt', 'gte', 'lte', 'eq'], valueType: 'number' },
  { value: 'enrollment_status', label: 'Enrollment Status', operators: ['eq', 'neq'], valueType: 'select', options: ['enrolled', 'completed', 'dropped'] },
  { value: 'course_id', label: 'Enrolled in Course', operators: ['eq'], valueType: 'text' },
  { value: 'last_active_days_ago', label: 'Last Active (Days Ago)', operators: ['gt', 'lt', 'gte', 'lte'], valueType: 'number' },
  { value: 'gender', label: 'Gender', operators: ['eq', 'neq'], valueType: 'select', options: ['male', 'female', 'other'] },
];

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'equals',
  neq: 'not equals',
  gt: 'greater than',
  lt: 'less than',
  gte: 'at least',
  lte: 'at most',
  in: 'is one of',
  like: 'contains',
};

export default function CreateSegmentPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [isShared, setIsShared] = useState(false);
  const [criteria, setCriteria] = useState<FilterCriterion[]>([
    { field: 'lifecycle_stage', operator: 'eq', value: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');

  const addCriterion = () => {
    setCriteria(prev => [...prev, { field: 'lifecycle_stage', operator: 'eq', value: '' }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, updates: Partial<FilterCriterion>) => {
    setCriteria(prev =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        // Reset operator and value when field changes
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
    const validCriteria = criteria.filter(c => c.value !== '');
    if (validCriteria.length === 0) {
      setError('Add at least one filter criterion with a value.');
      return;
    }

    try {
      setPreviewing(true);
      setError('');

      // Create a temporary segment, evaluate it, then delete it
      const createRes = await fetch('/api/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `_preview_${Date.now()}`,
          criteria: validCriteria,
          logic,
        }),
      });

      if (!createRes.ok) {
        setError('Failed to preview segment.');
        return;
      }

      const { segment } = await createRes.json();

      // Evaluate
      const evalRes = await fetch(`/api/crm/segments/${segment.id}/evaluate`, { method: 'POST' });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setPreviewCount(evalData.member_count);
      }

      // Clean up temp segment
      await fetch(`/api/crm/segments/${segment.id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to preview segment.');
      showToast('Failed to preview segment', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Segment name is required.');
      return;
    }

    const validCriteria = criteria.filter(c => c.value !== '');
    if (validCriteria.length === 0) {
      setError('Add at least one filter criterion with a value.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          criteria: validCriteria,
          logic,
          is_shared: isShared,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create segment.');
        return;
      }

      const { segment } = await res.json();

      // Evaluate the new segment
      await fetch(`/api/crm/segments/${segment.id}/evaluate`, { method: 'POST' });

      showToast('Segment created successfully', 'success');
      router.push(`/crm/segments/${segment.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to create segment.');
      showToast('Failed to create segment', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Segment</h1>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 mb-4">Segment Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Segment Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., At-Risk Students in CS101"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this segment..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="rounded-md border-gray-300 text-oecs-navy-blue focus:ring-blue-500/20 w-4 h-4"
                />
                <span className="group-hover:text-gray-900 transition-colors">Share with all staff</span>
              </label>
            </div>
          </div>
        </div>

        {/* Filter Criteria */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Filter Criteria</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-medium">Match:</span>
              <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                <button
                  onClick={() => { setLogic('AND'); setPreviewCount(null); }}
                  className={`px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 ${
                    logic === 'AND'
                      ? 'bg-oecs-navy-blue text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ALL (AND)
                </button>
                <button
                  onClick={() => { setLogic('OR'); setPreviewCount(null); }}
                  className={`px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 ${
                    logic === 'OR'
                      ? 'bg-oecs-navy-blue text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ANY (OR)
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {criteria.map((criterion, index) => {
              const fieldDef = getFieldDef(criterion.field);
              return (
                <div key={index} className="flex items-start gap-2 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                  {/* Field */}
                  <select
                    value={criterion.field}
                    onChange={(e) => updateCriterion(index, { field: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm min-w-[160px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                  >
                    {FILTER_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={criterion.operator}
                    onChange={(e) => updateCriterion(index, { operator: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm min-w-[120px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                  >
                    {(fieldDef?.operators || ['eq']).map(op => (
                      <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
                    ))}
                  </select>

                  {/* Value */}
                  {fieldDef?.valueType === 'select' ? (
                    <select
                      value={criterion.value}
                      onChange={(e) => updateCriterion(index, { value: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                    >
                      <option value="">Select...</option>
                      {(fieldDef.options || []).map(opt => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={fieldDef?.valueType === 'number' ? 'number' : 'text'}
                      value={criterion.value}
                      onChange={(e) => updateCriterion(index, { value: e.target.value })}
                      placeholder={fieldDef?.valueType === 'number' ? 'Value...' : 'Enter value...'}
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                    />
                  )}

                  {/* Remove */}
                  {criteria.length > 1 && (
                    <button
                      onClick={() => removeCriterion(index)}
                      className="px-2 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <Icon icon="mdi:close" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={addCriterion}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-oecs-navy-blue hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Add Filter
            </button>
          </div>
        </div>

        {/* Preview & Save */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {previewing ? (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon icon="mdi:eye-outline" className="w-4 h-4" />
                )}
                Preview Count
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
              className="px-6 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {saving ? (
                <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon icon="mdi:content-save" className="w-4 h-4" />
              )}
              Create Segment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
