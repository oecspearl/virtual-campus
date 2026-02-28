'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

const EVENT_TYPES = [
  { value: 'enrollment_created', label: 'Enrollment Created' },
  { value: 'quiz_failed', label: 'Quiz Failed' },
  { value: 'inactivity_detected', label: 'Inactivity Detected' },
  { value: 'risk_score_changed', label: 'Risk Score Changed' },
  { value: 'assignment_missed', label: 'Assignment Missed' },
  { value: 'stage_changed', label: 'Lifecycle Stage Changed' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_stage', label: 'Update Lifecycle Stage' },
  { value: 'create_notification', label: 'Send Notification' },
];

const STAGES = ['prospect', 'onboarding', 'active', 'at_risk', 're_engagement', 'completing', 'alumni'];

const STEP_LABELS = ['Basics & Trigger', 'Actions', 'Review'];

interface ActionConfig {
  type: string;
  config: Record<string, any>;
}

export default function CreateWorkflowPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('event');
  const [eventType, setEventType] = useState('enrollment_created');
  const [thresholdMetric, setThresholdMetric] = useState('engagement_score');
  const [thresholdOperator, setThresholdOperator] = useState('lt');
  const [thresholdValue, setThresholdValue] = useState('');
  const [actions, setActions] = useState<ActionConfig[]>([
    { type: 'create_notification', config: { title: '', message: '' } },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addAction = () => {
    setActions(prev => [...prev, { type: 'create_notification', config: { title: '', message: '' } }]);
  };

  const removeAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    setActions(prev =>
      prev.map((a, i) => {
        if (i !== index) return a;
        const updated = { ...a, ...updates };
        if (updates.type && updates.type !== a.type) {
          updated.config = {};
        }
        return updated;
      })
    );
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    setActions(prev =>
      prev.map((a, i) => i === index ? { ...a, config: { ...a.config, [key]: value } } : a)
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Workflow name is required.'); return; }
    if (actions.length === 0) { setError('At least one action is required.'); return; }

    try {
      setSaving(true);
      setError('');

      const triggerConfig: Record<string, any> = {};
      if (triggerType === 'event') {
        triggerConfig.event_type = eventType;
      } else if (triggerType === 'score_threshold') {
        triggerConfig.metric = thresholdMetric;
        triggerConfig.operator = thresholdOperator;
        triggerConfig.value = Number(thresholdValue);
      }

      const res = await fetch('/api/crm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          conditions: [],
          actions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create workflow.');
        return;
      }

      const { workflow } = await res.json();
      showToast('Workflow created successfully', 'success');
      router.push(`/crm/workflows/${workflow.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to create workflow.');
      showToast('Failed to create workflow', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Workflow</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step indicators - connected progress bar */}
        <div className="flex items-center mb-8">
          {STEP_LABELS.map((label, index) => {
            const s = index + 1;
            const isActive = step === s;
            const isCompleted = step > s;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => setStep(s)}
                  className="flex items-center gap-2.5 group"
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-oecs-navy-blue text-white shadow-md shadow-blue-200'
                      : isCompleted
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <Icon icon="mdi:check" className="w-4 h-4" />
                    ) : (
                      s
                    )}
                  </span>
                  <span className={`text-sm font-medium transition-colors hidden sm:inline ${
                    isActive
                      ? 'text-oecs-navy-blue'
                      : isCompleted
                        ? 'text-blue-700'
                        : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                </button>
                {index < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                    step > s ? 'bg-blue-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Basics & Trigger */}
        {step === 1 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Workflow Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., At-Risk Student Alert"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'event', label: 'Event', icon: 'mdi:flash', desc: 'Triggered by student events' },
                  { key: 'score_threshold', label: 'Threshold', icon: 'mdi:chart-line', desc: 'When a score crosses a threshold' },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTriggerType(t.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      triggerType === t.key
                        ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon icon={t.icon} className={`w-5 h-5 mb-1.5 ${triggerType === t.key ? 'text-oecs-navy-blue' : 'text-gray-400'}`} />
                    <div className={`text-sm font-semibold ${triggerType === t.key ? 'text-oecs-navy-blue' : 'text-gray-900'}`}>{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {triggerType === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                >
                  {EVENT_TYPES.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            )}

            {triggerType === 'score_threshold' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Metric</label>
                  <select
                    value={thresholdMetric}
                    onChange={(e) => setThresholdMetric(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                  >
                    <option value="engagement_score">Engagement Score</option>
                    <option value="risk_score">Risk Score</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Operator</label>
                  <select
                    value={thresholdOperator}
                    onChange={(e) => setThresholdOperator(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="gte">At least</option>
                    <option value="lte">At most</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md">
                Next: Actions
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Actions */}
        {step === 2 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-5">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Actions</h2>

            {actions.map((action, index) => (
              <div key={index} className="relative pl-5 border-l-2 border-l-blue-400">
                <div className="absolute -left-3 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-oecs-navy-blue text-white text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="p-4 bg-gray-50/80 rounded-xl space-y-3 ml-1">
                  <div className="flex items-center justify-between">
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(index, { type: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                    >
                      {ACTION_TYPES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    {actions.length > 1 && (
                      <button onClick={() => removeAction(index)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50">
                        <Icon icon="mdi:close" className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {action.type === 'send_email' && (
                    <>
                      <input
                        type="text"
                        placeholder="Email subject..."
                        value={action.config.subject || ''}
                        onChange={(e) => updateActionConfig(index, 'subject', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400"
                      />
                      <textarea
                        placeholder="Email body (HTML)..."
                        value={action.config.body_html || ''}
                        onChange={(e) => updateActionConfig(index, 'body_html', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400 resize-none"
                      />
                    </>
                  )}

                  {action.type === 'create_task' && (
                    <>
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={action.config.title || ''}
                        onChange={(e) => updateActionConfig(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400"
                      />
                      <div className="flex gap-2">
                        <select
                          value={action.config.priority || 'medium'}
                          onChange={(e) => updateActionConfig(index, 'priority', e.target.value)}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Due in X days"
                          value={action.config.due_in_days || ''}
                          onChange={(e) => updateActionConfig(index, 'due_in_days', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400"
                        />
                      </div>
                    </>
                  )}

                  {action.type === 'update_stage' && (
                    <select
                      value={action.config.stage || ''}
                      onChange={(e) => updateActionConfig(index, 'stage', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none"
                    >
                      <option value="">Select stage...</option>
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                      ))}
                    </select>
                  )}

                  {action.type === 'create_notification' && (
                    <>
                      <input
                        type="text"
                        placeholder="Notification title..."
                        value={action.config.title || ''}
                        onChange={(e) => updateActionConfig(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Notification message..."
                        value={action.config.message || ''}
                        onChange={(e) => updateActionConfig(index, 'message', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none placeholder-gray-400"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addAction}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-oecs-navy-blue hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Add Action
            </button>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                Back
              </button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md">
                Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 space-y-5">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Review Workflow</h2>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Name</span>
                <div className="font-semibold text-gray-900 mt-1">{name || '(unnamed)'}</div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Trigger</span>
                <div className="font-semibold text-gray-900 mt-1 capitalize">
                  {triggerType === 'event' ? `Event: ${eventType.replace(/_/g, ' ')}` : `Score threshold: ${thresholdMetric} ${thresholdOperator} ${thresholdValue}`}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Actions ({actions.length})</span>
                <ul className="mt-2 space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-900">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-oecs-navy-blue text-white text-xs font-semibold">{i + 1}</span>
                      <span className="font-medium capitalize">{a.type.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-start gap-2">
                <Icon icon="mdi:information-outline" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>The workflow will be created in inactive state. You can activate it from the workflows list.</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {saving ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:content-save" className="w-4 h-4" />}
                Create Workflow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
