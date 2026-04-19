'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';
import Button from '@/app/components/ui/Button';

interface DashboardData {
  total_students: number;
  lifecycle: { stage_counts: Record<string, number>; tracked: number };
  risk: { level_counts: Record<string, number>; at_risk_count: number };
  engagement: { average_score: number; distribution: Record<string, number>; scored_students: number };
  tasks: { pending: number; overdue: number; urgent: number; total: number };
  campaigns: { recent: Array<{ id: string; name: string; status: string; stats: any; sent_at: string | null }> };
  workflows: { active: number; total: number; total_executions: number };
  segments: { total: number };
  recent_interactions: Array<{ id: string; student_id: string; type: string; subject: string; created_by_name: string | null; created_at: string }>;
}

const PIPELINE_STAGES = [
  { key: 'prospect', label: 'Prospect', barClass: 'bg-slate-400' },
  { key: 'onboarding', label: 'Onboarding', barClass: 'bg-blue-500' },
  { key: 'active', label: 'Active', barClass: 'bg-emerald-500' },
  { key: 'at_risk', label: 'At Risk', barClass: 'bg-red-500' },
  { key: 're_engagement', label: 'Re-Engage', barClass: 'bg-amber-500' },
  { key: 'completing', label: 'Completing', barClass: 'bg-violet-500' },
  { key: 'alumni', label: 'Alumni', barClass: 'bg-indigo-500' },
];

const ENGAGEMENT_LEVELS = [
  { key: 'excellent', label: 'Excellent', range: '85–100', barClass: 'bg-emerald-500' },
  { key: 'high', label: 'High', range: '65–84', barClass: 'bg-blue-500' },
  { key: 'medium', label: 'Medium', range: '40–64', barClass: 'bg-amber-500' },
  { key: 'low', label: 'Low', range: '0–39', barClass: 'bg-red-500' },
];

const RISK_LEVELS = [
  { key: 'low', label: 'Low', barClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
  { key: 'medium', label: 'Medium', barClass: 'bg-amber-500', textClass: 'text-amber-600' },
  { key: 'high', label: 'High', barClass: 'bg-red-500', textClass: 'text-red-600' },
  { key: 'critical', label: 'Critical', barClass: 'bg-red-800', textClass: 'text-red-800' },
];

const TYPE_COLORS: Record<string, string> = {
  note: 'bg-blue-100 text-blue-700',
  email: 'bg-emerald-100 text-emerald-700',
  intervention: 'bg-red-100 text-red-700',
  call: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-600',
  meeting: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS: Record<string, string> = {
  note: 'Note',
  email: 'Email',
  intervention: 'Intervention',
  call: 'Call',
  system: 'System',
  meeting: 'Meeting',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CRMDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch('/api/crm/dashboard');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        showToast('Failed to load dashboard data', 'error');
        setError(true);
        return;
      }
      const dashData = await res.json();
      setData(dashData);
    } catch (err) {
      console.error('CRM Dashboard: Error', err);
      showToast('Failed to load dashboard data', 'error');
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-12 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 h-24 animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 shadow-sm h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:alert-circle-outline" className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-sm text-gray-500 mb-6">Something went wrong while loading the CRM dashboard data.</p>
          <Button onClick={() => fetchDashboard()} size="sm">Try Again</Button>
        </div>
      </div>
    );
  }

  const engTotal = (data.engagement.distribution.low || 0) + (data.engagement.distribution.medium || 0) + (data.engagement.distribution.high || 0) + (data.engagement.distribution.excellent || 0);
  const totalPipelineStudents = Object.values(data.lifecycle.stage_counts).reduce((s, c) => s + c, 0);
  const riskTotal = Object.values(data.risk.level_counts).reduce((s, c) => s + c, 0);

  const kpiCards = [
    { label: 'Total Students', value: data.total_students.toLocaleString(), sub: 'tracked in CRM', icon: 'mdi:account-group', iconClass: 'text-blue-500' },
    { label: 'Avg Engagement', value: `${data.engagement.average_score}%`, sub: `${data.engagement.scored_students} scored`, icon: 'mdi:chart-line', iconClass: 'text-emerald-500' },
    { label: 'At-Risk Students', value: data.risk.at_risk_count.toString(), sub: 'require action', icon: 'mdi:alert-octagon-outline', iconClass: 'text-red-500' },
    { label: 'Pending Tasks', value: data.tasks.pending.toString(), sub: data.tasks.overdue > 0 ? `${data.tasks.overdue} overdue` : 'assigned to team', icon: 'mdi:clipboard-check-outline', iconClass: 'text-amber-500' },
    { label: 'Active Segments', value: data.segments.total.toString(), sub: 'auto-evaluated', icon: 'mdi:chart-pie', iconClass: 'text-violet-500' },
    { label: 'Live Workflows', value: data.workflows.active.toString(), sub: `${data.workflows.total_executions} runs`, icon: 'mdi:sitemap', iconClass: 'text-indigo-500' },
  ];

  const engLevels = ENGAGEMENT_LEVELS.map(e => ({
    ...e,
    count: data.engagement.distribution[e.key] || 0,
    pct: engTotal > 0 ? Math.round(((data.engagement.distribution[e.key] || 0) / engTotal) * 100) : 0,
  }));

  const riskLevels = RISK_LEVELS.map(r => ({
    ...r,
    count: data.risk.level_counts[r.key] || 0,
    pct: riskTotal > 0 ? Math.round(((data.risk.level_counts[r.key] || 0) / riskTotal) * 100) : 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">CRM Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Student engagement overview and activity feed.</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon icon={k.icon} className={`w-4 h-4 ${k.iconClass}`} />
              <span className="text-xs font-medium text-gray-500">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{k.value}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* LIFECYCLE PIPELINE */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Lifecycle Pipeline</h2>
          <span className="text-xs text-gray-500">{totalPipelineStudents.toLocaleString()} total</span>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap">
          {PIPELINE_STAGES.map((stage) => {
            const count = data.lifecycle.stage_counts[stage.key] || 0;
            const pct = totalPipelineStudents > 0 ? ((count / totalPipelineStudents) * 100).toFixed(1) : '0.0';
            return (
              <Link
                key={stage.key}
                href={`/crm/pipeline?stage=${stage.key}`}
                className="flex-1 min-w-[140px] p-4 relative overflow-hidden no-underline hover:bg-gray-50 transition-colors border-r border-gray-100 last:border-r-0 cursor-pointer"
              >
                <div className="text-xs font-medium text-gray-500 mb-1.5">{stage.label}</div>
                <div className="text-xl font-bold text-gray-900 leading-none mb-1">{count.toLocaleString()}</div>
                <div className="text-xs text-gray-400">{pct}%</div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${stage.barClass}`} />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ENGAGEMENT & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ENGAGEMENT DISTRIBUTION */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Engagement Distribution</h3>
            <span className="text-xs text-gray-500">{engTotal.toLocaleString()} students</span>
          </div>
          <div className="p-4 space-y-3">
            {engLevels.map(e => (
              <div key={e.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900 flex-1">{e.label}</span>
                  <span className="text-xs text-gray-400">{e.range}</span>
                  <span className="text-sm font-semibold text-gray-900 min-w-[36px] text-right">{e.count.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 min-w-[30px] text-right">{e.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${e.barClass}`}
                    style={{ width: `${e.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RISK DISTRIBUTION */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Risk Distribution</h3>
            <span className="text-xs text-gray-500">current cohort</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {riskLevels.map(r => (
                <div key={r.key} className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-gray-900 w-16">{r.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.barClass}`}
                      style={{ width: `${Math.min(r.pct * 1.3, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold min-w-[36px] text-right ${r.textClass}`}>
                    {r.count.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 min-w-[32px] text-right">{r.pct}%</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-1 rounded-full overflow-hidden">
              {riskLevels.map(r => (
                <div
                  key={r.key}
                  className={`h-2 rounded-full ${r.barClass}`}
                  style={{ flex: r.pct || 1 }}
                  title={`${r.label}: ${r.pct}%`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <span className="text-xs text-gray-500">last {Math.min(data.recent_interactions.length, 6)} events</span>
          </div>
          <div className="px-4">
            {data.recent_interactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No recent interactions.</p>
              </div>
            ) : (
              data.recent_interactions.slice(0, 6).map((interaction, i) => (
                <div
                  key={interaction.id}
                  className={`flex items-start gap-3 py-3 ${
                    i < Math.min(data.recent_interactions.length, 6) - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                      TYPE_COLORS[interaction.type] || TYPE_COLORS.note
                    }`}
                  >
                    {TYPE_LABELS[interaction.type] || 'Note'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
                      {interaction.created_by_name || 'System'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{interaction.subject}</div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                    {timeAgo(interaction.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
