'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  created_by_name: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: any;
  conditions: any[];
  actions: any[];
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

interface Execution {
  id: string;
  student_id: string | null;
  student_name: string | null;
  trigger_data: any;
  actions_executed: any[];
  status: string;
  error_message: string | null;
  executed_at: string;
}

interface ActionConfig { type: string; config: Record<string, any>; }

const TRIGGER_LABELS: Record<string, { label: string; icon: string; color: string; borderColor: string }> = {
  event: { label: 'Event', icon: 'mdi:flash', color: 'text-amber-600', borderColor: 'border-l-amber-400' },
  schedule: { label: 'Schedule', icon: 'mdi:clock-outline', color: 'text-blue-600', borderColor: 'border-l-blue-400' },
  score_threshold: { label: 'Threshold', icon: 'mdi:chart-line', color: 'text-purple-600', borderColor: 'border-l-violet-400' },
};

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

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  success: { color: 'text-emerald-700', dot: 'bg-emerald-500' },
  partial: { color: 'text-amber-700', dot: 'bg-amber-500' },
  failed: { color: 'text-red-700', dot: 'bg-red-500' },
};

export default function CRMWorkflowsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createTriggerType, setCreateTriggerType] = useState('event');
  const [createEventType, setCreateEventType] = useState('enrollment_created');
  const [createThresholdMetric, setCreateThresholdMetric] = useState('engagement_score');
  const [createThresholdOp, setCreateThresholdOp] = useState('lt');
  const [createThresholdVal, setCreateThresholdVal] = useState('');
  const [createActions, setCreateActions] = useState<ActionConfig[]>([
    { type: 'create_notification', config: { title: '', message: '' } },
  ]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Detail modal
  const [detailWorkflow, setDetailWorkflow] = useState<Workflow | null>(null);
  const [detailExecs, setDetailExecs] = useState<Execution[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/workflows?limit=50');
      if (!res.ok) { if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; } return; }
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('CRM Workflows: Error', error);
      showToast('Failed to load workflows', 'error');
    } finally { setLoading(false); }
  };

  const handleToggle = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/crm/workflows/${workflowId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, is_active: data.is_active } : w));
        if (detailWorkflow?.id === workflowId) setDetailWorkflow(prev => prev ? { ...prev, is_active: data.is_active } : null);
        showToast(`Workflow ${data.is_active ? 'activated' : 'deactivated'}`, 'success');
      } else { showToast('Failed to toggle workflow', 'error'); }
    } catch { showToast('Failed to toggle workflow', 'error'); }
  };

  const handleDelete = async (workflowId: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return;
    try {
      const res = await fetch(`/api/crm/workflows/${workflowId}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        if (detailWorkflow?.id === workflowId) setDetailWorkflow(null);
      }
    } catch { showToast('Failed to delete workflow', 'error'); }
  };

  // --- Create modal ---
  const openCreateModal = () => {
    setCreateStep(1); setCreateName(''); setCreateDesc('');
    setCreateTriggerType('event'); setCreateEventType('enrollment_created');
    setCreateThresholdMetric('engagement_score'); setCreateThresholdOp('lt'); setCreateThresholdVal('');
    setCreateActions([{ type: 'create_notification', config: { title: '', message: '' } }]);
    setCreateError(''); setShowCreate(true);
  };

  const addAction = () => { setCreateActions(prev => [...prev, { type: 'create_notification', config: { title: '', message: '' } }]); };
  const removeAction = (i: number) => { setCreateActions(prev => prev.filter((_, idx) => idx !== i)); };
  const updateAction = (i: number, updates: Partial<ActionConfig>) => {
    setCreateActions(prev => prev.map((a, idx) => {
      if (idx !== i) return a;
      const u = { ...a, ...updates };
      if (updates.type && updates.type !== a.type) u.config = {};
      return u;
    }));
  };
  const updateActionConfig = (i: number, key: string, value: string) => {
    setCreateActions(prev => prev.map((a, idx) => idx === i ? { ...a, config: { ...a.config, [key]: value } } : a));
  };

  const handleCreateSave = async () => {
    if (!createName.trim()) { setCreateError('Name is required.'); return; }
    if (createActions.length === 0) { setCreateError('At least one action is required.'); return; }
    try {
      setSaving(true); setCreateError('');
      const triggerConfig: Record<string, any> = {};
      if (createTriggerType === 'event') triggerConfig.event_type = createEventType;
      else if (createTriggerType === 'score_threshold') {
        triggerConfig.metric = createThresholdMetric;
        triggerConfig.operator = createThresholdOp;
        triggerConfig.value = Number(createThresholdVal);
      }
      const res = await fetch('/api/crm/workflows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(), description: createDesc.trim() || null,
          trigger_type: createTriggerType, trigger_config: triggerConfig,
          conditions: [], actions: createActions,
        }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || 'Failed to create workflow.'); return; }
      showToast('Workflow created', 'success');
      setShowCreate(false);
      fetchWorkflows();
    } catch { setCreateError('Failed to create workflow.'); }
    finally { setSaving(false); }
  };

  // --- Detail modal ---
  const openDetailModal = async (workflowId: string) => {
    setDetailLoading(true); setDetailWorkflow(null); setDetailExecs([]);
    try {
      const [wfRes, exRes] = await Promise.all([
        fetch(`/api/crm/workflows/${workflowId}`),
        fetch(`/api/crm/workflows/${workflowId}/executions?limit=20`),
      ]);
      if (wfRes.ok) { const d = await wfRes.json(); setDetailWorkflow(d.workflow); }
      if (exRes.ok) { const d = await exRes.json(); setDetailExecs(d.executions || []); }
    } catch { showToast('Failed to load workflow details', 'error'); }
    finally { setDetailLoading(false); }
  };

  const handleDetailToggle = async () => {
    if (!detailWorkflow) return;
    setToggling(true);
    await handleToggle(detailWorkflow.id);
    setToggling(false);
  };

  if (loading) {
    return (
      <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-56 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Automation Workflows</h1>
          <button onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md">
            <Icon icon="mdi:plus" className="w-4 h-4" /> New Workflow
          </button>
        </div>

        {workflows.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <Icon icon="mdi:robot-outline" className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Workflows Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Create automated workflows to respond to student events.</p>
            <button onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm">
              <Icon icon="mdi:plus" className="w-4 h-4" /> Create Workflow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(workflow => {
              const trigger = TRIGGER_LABELS[workflow.trigger_type] || TRIGGER_LABELS.event;
              return (
                <div key={workflow.id} className={`rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all p-5 border-l-4 ${trigger.borderColor}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <button onClick={() => openDetailModal(workflow.id)} className="text-base text-blue-600 hover:text-blue-900 font-semibold transition-colors">
                          {workflow.name}
                        </button>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${workflow.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${workflow.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {workflow.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {workflow.description && <p className="text-sm text-gray-500 mb-2">{workflow.description}</p>}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className={`flex items-center gap-1 ${trigger.color}`}>
                          <Icon icon={trigger.icon} className="w-4 h-4" /> {trigger.label}
                          {workflow.trigger_config?.event_type && `: ${workflow.trigger_config.event_type}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="mdi:play-circle-outline" className="w-4 h-4" /> {workflow.execution_count} executions
                        </span>
                        <span>{workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => handleToggle(workflow.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${workflow.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${workflow.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => openDetailModal(workflow.id)} className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200">
                        <Icon icon="mdi:eye-outline" className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(workflow.id, workflow.name)} className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100">
                        <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ===== CREATE WORKFLOW MODAL ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Create Workflow</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <Icon icon="mdi:close" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 flex-shrink-0" /> {createError}
                </div>
              )}

              {/* Step indicators */}
              <div className="flex items-center mb-6">
                {['Basics & Trigger', 'Actions', 'Review'].map((label, index) => {
                  const s = index + 1;
                  return (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <button onClick={() => setCreateStep(s)} className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                          createStep === s ? 'bg-blue-600 text-white' : createStep > s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>{createStep > s ? <Icon icon="mdi:check" className="w-3.5 h-3.5" /> : s}</span>
                        <span className={`text-xs font-medium hidden sm:inline ${createStep === s ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
                      </button>
                      {index < 2 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${createStep > s ? 'bg-blue-300' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Step 1 */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., At-Risk Student Alert"
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ key: 'event', label: 'Event', icon: 'mdi:flash', desc: 'Student events' }, { key: 'score_threshold', label: 'Threshold', icon: 'mdi:chart-line', desc: 'Score threshold' }].map(t => (
                        <button key={t.key} onClick={() => setCreateTriggerType(t.key)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${createTriggerType === t.key ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <Icon icon={t.icon} className={`w-5 h-5 mb-1 ${createTriggerType === t.key ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className={`text-sm font-semibold ${createTriggerType === t.key ? 'text-blue-600' : 'text-gray-900'}`}>{t.label}</div>
                          <div className="text-xs text-gray-500">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {createTriggerType === 'event' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                      <select value={createEventType} onChange={(e) => setCreateEventType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm">
                        {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                  )}
                  {createTriggerType === 'score_threshold' && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Metric</label>
                        <select value={createThresholdMetric} onChange={(e) => setCreateThresholdMetric(e.target.value)}
                          className="w-full px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none">
                          <option value="engagement_score">Engagement</option>
                          <option value="risk_score">Risk Score</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                        <select value={createThresholdOp} onChange={(e) => setCreateThresholdOp(e.target.value)}
                          className="w-full px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none">
                          <option value="gt">Greater than</option><option value="lt">Less than</option>
                          <option value="gte">At least</option><option value="lte">At most</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                        <input type="number" value={createThresholdVal} onChange={(e) => setCreateThresholdVal(e.target.value)}
                          className="w-full px-2 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button onClick={() => setCreateStep(2)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Next: Actions</button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {createStep === 2 && (
                <div className="space-y-4">
                  {createActions.map((action, index) => (
                    <div key={index} className="relative pl-5 border-l-2 border-l-blue-400">
                      <div className="absolute -left-2.5 top-3 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">{index + 1}</div>
                      <div className="p-3 bg-gray-50 rounded-lg space-y-2 ml-1">
                        <div className="flex items-center justify-between">
                          <select value={action.type} onChange={(e) => updateAction(index, { type: e.target.value })}
                            className="px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none">
                            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                          {createActions.length > 1 && (
                            <button onClick={() => removeAction(index)} className="text-red-400 hover:text-red-600 p-1"><Icon icon="mdi:close" className="w-4 h-4" /></button>
                          )}
                        </div>
                        {action.type === 'send_email' && (
                          <>
                            <input type="text" placeholder="Subject..." value={action.config.subject || ''} onChange={(e) => updateActionConfig(index, 'subject', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none placeholder-gray-400" />
                            <textarea placeholder="Body (HTML)..." value={action.config.body_html || ''} onChange={(e) => updateActionConfig(index, 'body_html', e.target.value)} rows={3}
                              className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-mono outline-none placeholder-gray-400 resize-none" />
                          </>
                        )}
                        {action.type === 'create_task' && (
                          <>
                            <input type="text" placeholder="Task title..." value={action.config.title || ''} onChange={(e) => updateActionConfig(index, 'title', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none placeholder-gray-400" />
                            <div className="flex gap-2">
                              <select value={action.config.priority || 'medium'} onChange={(e) => updateActionConfig(index, 'priority', e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none">
                                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                              </select>
                              <input type="number" placeholder="Due in X days" value={action.config.due_in_days || ''} onChange={(e) => updateActionConfig(index, 'due_in_days', e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none placeholder-gray-400" />
                            </div>
                          </>
                        )}
                        {action.type === 'update_stage' && (
                          <select value={action.config.stage || ''} onChange={(e) => updateActionConfig(index, 'stage', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none">
                            <option value="">Select stage...</option>
                            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                          </select>
                        )}
                        {action.type === 'create_notification' && (
                          <>
                            <input type="text" placeholder="Title..." value={action.config.title || ''} onChange={(e) => updateActionConfig(index, 'title', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none placeholder-gray-400" />
                            <input type="text" placeholder="Message..." value={action.config.message || ''} onChange={(e) => updateActionConfig(index, 'message', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none placeholder-gray-400" />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addAction} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Icon icon="mdi:plus" className="w-4 h-4" /> Add Action
                  </button>
                  <div className="flex justify-between pt-2">
                    <button onClick={() => setCreateStep(1)} className="px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">Back</button>
                    <button onClick={() => setCreateStep(3)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Review</button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</span>
                    <div className="font-semibold text-gray-900 mt-1 text-sm">{createName || '(unnamed)'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trigger</span>
                    <div className="font-semibold text-gray-900 mt-1 text-sm capitalize">
                      {createTriggerType === 'event' ? `Event: ${createEventType.replace(/_/g, ' ')}` : `Threshold: ${createThresholdMetric} ${createThresholdOp} ${createThresholdVal}`}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions ({createActions.length})</span>
                    <ul className="mt-2 space-y-1">
                      {createActions.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-900">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                          <span className="font-medium capitalize">{a.type.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs flex items-start gap-2">
                    <Icon icon="mdi:information-outline" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Created in inactive state. Activate from the list.
                  </div>
                  <div className="flex justify-between pt-2">
                    <button onClick={() => setCreateStep(2)} className="px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">Back</button>
                    <button onClick={handleCreateSave} disabled={saving}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                      {saving ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:content-save" className="w-4 h-4" />}
                      Create Workflow
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL WORKFLOW MODAL ===== */}
      {(detailWorkflow || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setDetailWorkflow(null); setDetailLoading(false); }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="text-gray-500 mt-4 text-sm">Loading workflow...</p>
              </div>
            ) : detailWorkflow && (
              <>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-gray-900">{detailWorkflow.name}</h2>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${detailWorkflow.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${detailWorkflow.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {detailWorkflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {detailWorkflow.description && <p className="text-sm text-gray-500 mt-0.5">{detailWorkflow.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleDetailToggle} disabled={toggling}
                      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                        detailWorkflow.is_active ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                      <Icon icon={detailWorkflow.is_active ? 'mdi:pause-circle-outline' : 'mdi:play-circle-outline'} className="w-4 h-4 inline mr-1" />
                      {detailWorkflow.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setDetailWorkflow(null)} className="p-1 hover:bg-gray-100 rounded-lg ml-2">
                      <Icon icon="mdi:close" className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Info Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 border-t-2 border-t-amber-400">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trigger</div>
                      <div className="text-sm font-bold text-gray-900 mt-1 capitalize">{detailWorkflow.trigger_type.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {detailWorkflow.trigger_config.event_type?.replace(/_/g, ' ') ||
                          `${detailWorkflow.trigger_config.metric} ${detailWorkflow.trigger_config.operator} ${detailWorkflow.trigger_config.value}` || 'Configured'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 border-t-2 border-t-blue-400">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{detailWorkflow.actions.length}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{detailWorkflow.actions.map((a: any) => a.type.replace(/_/g, ' ')).join(', ')}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 border-t-2 border-t-violet-400">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Executions</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{detailWorkflow.execution_count}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {detailWorkflow.last_executed_at ? `Last: ${new Date(detailWorkflow.last_executed_at).toLocaleString()}` : 'Never'}
                      </div>
                    </div>
                  </div>

                  {/* Execution Log */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-bold text-gray-900">Execution Log</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions Run</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailExecs.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">
                            No executions yet.{!detailWorkflow.is_active && ' Activate the workflow to start.'}
                          </td></tr>
                        ) : detailExecs.map(exec => {
                          const sc = STATUS_CONFIG[exec.status] || STATUS_CONFIG.failed;
                          return (
                            <tr key={exec.id} className="hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 text-sm text-gray-500">{new Date(exec.executed_at).toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{exec.student_name || exec.student_id || '-'}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 text-sm font-medium capitalize ${sc.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {exec.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{exec.actions_executed.map((a: any) => a.type).join(', ') || '-'}</td>
                              <td className="px-4 py-2.5 text-xs text-red-500">{exec.error_message || ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
