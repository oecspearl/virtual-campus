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
  actions: any[];
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, { label: string; icon: string; color: string; borderColor: string }> = {
  event: { label: 'Event', icon: 'mdi:flash', color: 'text-amber-600', borderColor: 'border-l-amber-400' },
  schedule: { label: 'Schedule', icon: 'mdi:clock-outline', color: 'text-blue-600', borderColor: 'border-l-blue-400' },
  score_threshold: { label: 'Threshold', icon: 'mdi:chart-line', color: 'text-purple-600', borderColor: 'border-l-violet-400' },
};

export default function CRMWorkflowsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/workflows?limit=50');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return; }
        return;
      }
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('CRM Workflows: Error', error);
      showToast('Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/crm/workflows/${workflowId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(prev =>
          prev.map(w => w.id === workflowId ? { ...w, is_active: data.is_active } : w)
        );
        showToast(`Workflow ${data.is_active ? 'activated' : 'deactivated'}`, 'success');
      } else {
        showToast('Failed to toggle workflow', 'error');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      showToast('Failed to toggle workflow', 'error');
    }
  };

  const handleDelete = async (workflowId: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return;
    try {
      const res = await fetch(`/api/crm/workflows/${workflowId}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete workflow', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-56 bg-gray-200 rounded-none animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-gray-200 rounded-none animate-pulse" />
          </div>
          {/* Skeleton Cards */}
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-none border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-8 w-8 bg-gray-100 rounded-none animate-pulse" />
                    <div className="h-8 w-8 bg-gray-100 rounded-none animate-pulse" />
                  </div>
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Automation Workflows</h1>
          </div>
          <Link
            href="/crm/workflows/create"
            className="px-4 py-2 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-none transition-all duration-300 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Workflow
          </Link>
        </div>

        {/* Workflows List */}
        {workflows.length === 0 ? (
          <div className="rounded-none border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-5">
              <Icon icon="mdi:robot-outline" className="w-10 h-10 text-oecs-navy-blue" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-2">No Workflows Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create automated workflows to respond to student events, score changes, and more.
            </p>
            <Link
              href="/crm/workflows/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-oecs-navy-blue hover:bg-blue-900 text-white rounded-none transition-all duration-300 text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Icon icon="mdi:plus" className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(workflow => {
              const trigger = TRIGGER_LABELS[workflow.trigger_type] || TRIGGER_LABELS.event;
              return (
                <div
                  key={workflow.id}
                  className={`rounded-none border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 p-5 border-l-4 ${trigger.borderColor}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/crm/workflows/${workflow.id}`}
                          className="text-base text-oecs-navy-blue hover:text-blue-900 font-semibold transition-colors"
                        >
                          {workflow.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          workflow.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${workflow.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {workflow.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 mb-2">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className={`flex items-center gap-1 ${trigger.color}`}>
                          <Icon icon={trigger.icon} className="w-4 h-4" />
                          {trigger.label}
                          {workflow.trigger_config?.event_type && `: ${workflow.trigger_config.event_type}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="mdi:play-circle-outline" className="w-4 h-4" />
                          {workflow.execution_count} executions
                        </span>
                        <span>{workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}</span>
                        {workflow.last_executed_at && (
                          <span>Last: {new Date(workflow.last_executed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggle(workflow.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          workflow.is_active ? 'bg-oecs-navy-blue' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                          workflow.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <Link
                        href={`/crm/workflows/${workflow.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-none transition-colors border border-transparent hover:border-gray-200"
                      >
                        <Icon icon="mdi:eye-outline" className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(workflow.id, workflow.name)}
                        className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-none transition-colors border border-transparent hover:border-red-100"
                      >
                        <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
