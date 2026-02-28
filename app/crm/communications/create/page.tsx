'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Segment {
  id: string;
  name: string;
  member_count: number;
}

interface Programme {
  id: string;
  title: string;
}

interface FormField {
  id: string; // local temp id
  type: 'text' | 'essay' | 'multiple_choice' | 'multiple_select' | 'rating_scale';
  question_text: string;
  description: string;
  required: boolean;
  options: any;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: 'mdi:form-textbox' },
  { value: 'essay', label: 'Long Text / Essay', icon: 'mdi:text-long' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'mdi:radiobox-marked' },
  { value: 'multiple_select', label: 'Multiple Select', icon: 'mdi:checkbox-marked-outline' },
  { value: 'rating_scale', label: 'Rating Scale', icon: 'mdi:star-half-full' },
];

function generateId() {
  return 'field_' + Math.random().toString(36).slice(2, 9);
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Campaign basics
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);

  // Campaign type
  const [campaignType, setCampaignType] = useState<'broadcast' | 'application'>('broadcast');
  const [programmeId, setProgrammeId] = useState('');
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  // Application form fields
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSegments();
    fetchProgrammes();
  }, []);

  const fetchSegments = async () => {
    try {
      const res = await fetch('/api/crm/segments?limit=100');
      if (res.ok) {
        const data = await res.json();
        setSegments(data.segments || []);
      }
    } catch (err) {
      console.error('Failed to fetch segments:', err);
      showToast('Failed to load segments', 'error');
    }
  };

  const fetchProgrammes = async () => {
    try {
      const res = await fetch('/api/programmes?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProgrammes(data.programmes || []);
      }
    } catch (err) {
      console.error('Failed to fetch programmes:', err);
    }
  };

  // ---- Form Field Management ----
  const addField = () => {
    setFormFields(prev => [...prev, {
      id: generateId(),
      type: 'text',
      question_text: '',
      description: '',
      required: true,
      options: null,
    }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFormFields(prev => prev.filter(f => f.id !== id));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    setFormFields(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  // ---- Save ----
  const handleSave = async (sendImmediately = false) => {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      setError('Name, subject, and body are required.');
      return;
    }

    if (!segmentId) {
      setError('Please select a target segment.');
      return;
    }

    if (campaignType === 'application') {
      if (!programmeId) {
        setError('Please select a programme for the application campaign.');
        return;
      }
      if (formFields.length === 0) {
        setError('Please add at least one application form field.');
        return;
      }
      const emptyFields = formFields.filter(f => !f.question_text.trim());
      if (emptyFields.length > 0) {
        setError('All form fields must have a question.');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');

      const metadata = campaignType === 'application'
        ? { campaign_type: 'application', programme_id: programmeId }
        : {};

      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          body_html: bodyHtml,
          segment_id: segmentId,
          scheduled_for: scheduledFor || null,
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create campaign.');
        return;
      }

      const { campaign } = await res.json();

      // If application campaign, save the form fields
      if (campaignType === 'application' && formFields.length > 0) {
        const fieldsRes = await fetch(`/api/crm/campaigns/${campaign.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: formFields.map((f, idx) => ({
              type: f.type,
              question_text: f.question_text,
              description: f.description || null,
              order: idx,
              required: f.required,
              options: f.options,
            })),
          }),
        });

        if (!fieldsRes.ok) {
          showToast('Campaign created but failed to save form fields. You can edit them later.', 'error');
          router.push(`/crm/communications/${campaign.id}`);
          return;
        }
      }

      if (sendImmediately) {
        const sendRes = await fetch(`/api/crm/campaigns/${campaign.id}/send`, { method: 'POST' });
        if (!sendRes.ok) {
          const sendData = await sendRes.json();
          setError(sendData.error || 'Campaign created but send failed.');
          showToast('Campaign created but send failed', 'error');
          router.push(`/crm/communications/${campaign.id}`);
          return;
        }
        showToast('Campaign created and sent successfully', 'success');
      } else {
        showToast('Campaign created successfully', 'success');
      }

      router.push(`/crm/communications/${campaign.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to create campaign.');
      showToast('Failed to create campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedSegment = segments.find(s => s.id === segmentId);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Campaign</h1>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Campaign Type Toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Icon icon="mdi:swap-horizontal" className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Campaign Type</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCampaignType('broadcast')}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                campaignType === 'broadcast'
                  ? 'border-oecs-navy-blue bg-blue-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="mdi:bullhorn-outline" className={`w-5 h-5 ${campaignType === 'broadcast' ? 'text-oecs-navy-blue' : 'text-gray-400'}`} />
                <span className={`font-semibold text-sm ${campaignType === 'broadcast' ? 'text-oecs-navy-blue' : 'text-gray-700'}`}>Broadcast</span>
              </div>
              <p className="text-xs text-gray-500">Send an informational email to your segment.</p>
            </button>
            <button
              type="button"
              onClick={() => setCampaignType('application')}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                campaignType === 'application'
                  ? 'border-oecs-navy-blue bg-blue-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="mdi:clipboard-text-outline" className={`w-5 h-5 ${campaignType === 'application' ? 'text-oecs-navy-blue' : 'text-gray-400'}`} />
                <span className={`font-semibold text-sm ${campaignType === 'application' ? 'text-oecs-navy-blue' : 'text-gray-700'}`}>Application</span>
              </div>
              <p className="text-xs text-gray-500">Invite students to apply for a programme.</p>
            </button>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon icon="mdi:bullhorn-outline" className="w-4 h-4 text-oecs-navy-blue" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Campaign Details</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Back - Spring 2026"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Segment *</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none appearance-none"
            >
              <option value="">Select a segment...</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.member_count} members)</option>
              ))}
            </select>
            {selectedSegment && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <Icon icon="mdi:account-group-outline" className="w-3.5 h-3.5" />
                This campaign will be sent to {selectedSegment.member_count} students.
              </p>
            )}
          </div>

          {/* Programme selector for application campaigns */}
          {campaignType === 'application' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Programme *</label>
              <select
                value={programmeId}
                onChange={(e) => setProgrammeId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none appearance-none"
              >
                <option value="">Select a programme...</option>
                {programmes.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <Icon icon="mdi:information-outline" className="w-3.5 h-3.5" />
                Approved applicants will be auto-enrolled in this programme.
              </p>
            </div>
          )}
        </div>

        {/* Email Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Icon icon="mdi:email-edit-outline" className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Email Content</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Line *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Important update about your courses"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Use {'{{student_name}}'} and {'{{student_email}}'} for personalization.
              {campaignType === 'application' && (
                <> Use <code className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-mono">{'{{application_link}}'}</code> for the application form link.</>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Body (HTML) *</label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={12}
              placeholder={campaignType === 'application'
                ? '<h2>Hello {{student_name}},</h2>\n<p>You are invited to apply for our programme!</p>\n<p><a href="{{application_link}}">Click here to apply</a></p>'
                : '<h2>Hello {{student_name}},</h2>\n<p>We wanted to reach out about...</p>'
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none font-mono text-sm"
            />
          </div>

          {campaignType === 'application' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-2">
                <Icon icon="mdi:lightbulb-outline" className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <strong>Tip:</strong> Include <code className="px-1 py-0.5 bg-white/60 rounded font-mono">{'{{application_link}}'}</code> in your email body.
                  Each recipient will receive a unique personalized link to the application form.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Application Form Fields */}
        {campaignType === 'application' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Icon icon="mdi:form-select" className="w-4 h-4 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">Application Form Fields</h2>
              </div>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1.5 bg-oecs-navy-blue text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-blue-900 transition-colors"
              >
                <Icon icon="mdi:plus" className="w-4 h-4" />
                Add Field
              </button>
            </div>

            {formFields.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Icon icon="mdi:form-textbox" className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No form fields yet. Click &quot;Add Field&quot; to start building your application form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'], options: null })}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        >
                          {FIELD_TYPES.map(ft => (
                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                        >
                          <Icon icon="mdi:arrow-up" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === formFields.length - 1}
                          className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                        >
                          <Icon icon="mdi:arrow-down" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={field.question_text}
                        onChange={(e) => updateField(field.id, { question_text: e.target.value })}
                        placeholder="Enter your question..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      />
                      <input
                        type="text"
                        value={field.description}
                        onChange={(e) => updateField(field.id, { description: e.target.value })}
                        placeholder="Optional description or helper text..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      />

                      {/* Options editor for choice-based types */}
                      {(field.type === 'multiple_choice' || field.type === 'multiple_select') && (
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Options (one per line)</label>
                          <textarea
                            value={(field.options?.choices || []).join('\n')}
                            onChange={(e) => updateField(field.id, {
                              options: { choices: e.target.value.split('\n').filter(Boolean) }
                            })}
                            rows={3}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                      )}

                      {/* Rating scale config */}
                      {field.type === 'rating_scale' && (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-500">Min:</label>
                            <input
                              type="number"
                              value={field.options?.min || 1}
                              onChange={(e) => updateField(field.id, {
                                options: { ...field.options, min: parseInt(e.target.value) || 1 }
                              })}
                              className="w-16 px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-500">Max:</label>
                            <input
                              type="number"
                              value={field.options?.max || 5}
                              onChange={(e) => updateField(field.id, {
                                options: { ...field.options, max: parseInt(e.target.value) || 5 }
                              })}
                              className="w-16 px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-900 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-oecs-navy-blue focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">Required</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Icon icon="mdi:clock-outline" className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Schedule <span className="text-sm font-normal text-gray-400">(Optional)</span></h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Send At</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">Leave empty to save as draft. Set a date to schedule auto-send.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 text-sm font-medium disabled:opacity-50"
            >
              {scheduledFor ? 'Schedule Campaign' : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-2.5 bg-oecs-navy-blue text-white rounded-xl hover:bg-blue-900 transition-all duration-300 text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {saving ? (
                <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon icon="mdi:send" className="w-4 h-4" />
              )}
              Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
