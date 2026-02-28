'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: any;
  conditions: any[];
  actions: any[];
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  users?: { name: string };
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

const STATUS_CONFIG: Record<string, { color: string; dot: string; bg: string }> = {
  success: { color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  partial: { color: 'text-amber-700', dot: 'bg-amber-500', bg: 'bg-amber-50' },
  failed: { color: 'text-red-700', dot: 'bg-red-500', bg: 'bg-red-50' },
};

const INFO_CARD_CONFIG: Record<string, { icon: string; borderColor: string; iconBg: string; iconColor: string }> = {
  trigger: { icon: 'mdi:flash', borderColor: 'border-t-amber-400', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  actions: { icon: 'mdi:cog-outline', borderColor: 'border-t-blue-400', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  executions: { icon: 'mdi:play-circle-outline', borderColor: 'border-t-violet-400', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
};

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wfRes, exRes] = await Promise.all([
        fetch(`/api/crm/workflows/${id}`),
        fetch(`/api/crm/workflows/${id}/executions?limit=20`),
      ]);

      if (!wfRes.ok) {
        if (wfRes.status === 401 || wfRes.status === 403) { router.push('/dashboard'); return; }
        if (wfRes.status === 404) { router.push('/crm/workflows'); return; }
        return;
      }

      const wfData = await wfRes.json();
      setWorkflow(wfData.workflow);

      if (exRes.ok) {
        const exData = await exRes.json();
        setExecutions(exData.executions || []);
      }
    } catch (error) {
      console.error('Workflow detail error:', error);
      showToast('Failed to load workflow details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setToggling(true);
      const res = await fetch(`/api/crm/workflows/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkflow(prev => prev ? { ...prev, is_active: data.is_active } : null);
        showToast(`Workflow ${data.is_active ? 'activated' : 'deactivated'}`, 'success');
      } else {
        showToast('Failed to toggle workflow', 'error');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      showToast('Failed to toggle workflow', 'error');
    } finally {
      setToggling(false);
    }
  };

  if (loading || !workflow) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-52 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mt-2" />
              </div>
            </div>
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse" />
          </div>
          {/* Skeleton Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm border-t-4 border-t-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Skeleton Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-6">
                  <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
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
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{workflow.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  workflow.is_active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${workflow.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {workflow.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {workflow.description && (
                <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md ${
              workflow.is_active
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon icon={workflow.is_active ? 'mdi:pause-circle-outline' : 'mdi:play-circle-outline'} className="w-4 h-4" />
              {workflow.is_active ? 'Deactivate' : 'Activate'}
            </span>
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 border-t-4 ${INFO_CARD_CONFIG.trigger.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${INFO_CARD_CONFIG.trigger.iconBg}`}>
                <Icon icon={INFO_CARD_CONFIG.trigger.icon} className={`w-5 h-5 ${INFO_CARD_CONFIG.trigger.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Trigger</span>
            </div>
            <div className="text-sm font-bold tracking-tight text-gray-900 capitalize">
              {workflow.trigger_type.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {workflow.trigger_config.event_type?.replace(/_/g, ' ') ||
                `${workflow.trigger_config.metric} ${workflow.trigger_config.operator} ${workflow.trigger_config.value}` ||
                'Configured'}
            </div>
          </div>
          <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 border-t-4 ${INFO_CARD_CONFIG.actions.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${INFO_CARD_CONFIG.actions.iconBg}`}>
                <Icon icon={INFO_CARD_CONFIG.actions.icon} className={`w-5 h-5 ${INFO_CARD_CONFIG.actions.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Actions</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-gray-900">{workflow.actions.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              {workflow.actions.map((a: any) => a.type.replace(/_/g, ' ')).join(', ')}
            </div>
          </div>
          <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 border-t-4 ${INFO_CARD_CONFIG.executions.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${INFO_CARD_CONFIG.executions.iconBg}`}>
                <Icon icon={INFO_CARD_CONFIG.executions.icon} className={`w-5 h-5 ${INFO_CARD_CONFIG.executions.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Executions</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-gray-900">{workflow.execution_count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {workflow.last_executed_at
                ? `Last: ${new Date(workflow.last_executed_at).toLocaleString()}`
                : 'Never executed'}
            </div>
          </div>
        </div>

        {/* Execution Log */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-base font-bold tracking-tight text-gray-900">Execution Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions Run</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
                        <Icon icon="mdi:history" className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">
                        No executions yet. {!workflow.is_active && 'Activate the workflow to start processing events.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  executions.map(exec => {
                    const statusCfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.failed;
                    return (
                      <tr key={exec.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 text-sm text-gray-500">
                          {new Date(exec.executed_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                          {exec.student_name || exec.student_id || '-'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium capitalize ${statusCfg.color}`}>
                            <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                            {exec.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500">
                          {exec.actions_executed.map((a: any) => a.type).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-red-500">{exec.error_message || ''}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
