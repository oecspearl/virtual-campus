'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  { key: 'prospect', label: 'Prospect', color: 'var(--theme-primary)' },
  { key: 'onboarding', label: 'Onboarding', color: 'var(--theme-secondary)' },
  { key: 'active', label: 'Active', color: '#10B981' },
  { key: 'at_risk', label: 'At Risk', color: '#EF4444' },
  { key: 're_engagement', label: 'Re-Engage', color: '#F59E0B' },
  { key: 'completing', label: 'Completing', color: '#10B981' },
  { key: 'alumni', label: 'Alumni', color: 'var(--theme-primary)' },
];

const ENGAGEMENT_LEVELS = [
  { key: 'excellent', label: 'Excellent', range: '85–100', color: '#10B981' },
  { key: 'high', label: 'High', range: '65–84', color: 'var(--theme-secondary)' },
  { key: 'medium', label: 'Medium', range: '40–64', color: '#F59E0B' },
  { key: 'low', label: 'Low', range: '0–39', color: '#EF4444' },
];

const RISK_LEVELS = [
  { key: 'low', label: 'Low', color: '#10B981' },
  { key: 'medium', label: 'Medium', color: '#F59E0B' },
  { key: 'high', label: 'High', color: '#EF4444' },
  { key: 'critical', label: 'Critical', color: '#991B1B' },
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
  note: 'NOTE',
  email: 'EMAIL',
  intervention: 'INTV',
  call: 'CALL',
  system: 'SYS',
  meeting: 'MTG',
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-12 bg-gray-200 rounded mb-1.5" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-24 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl font-bold">!</div>
        <h2 className="text-lg font-display text-gray-900 mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">Something went wrong while loading the CRM dashboard data.</p>
        <Button onClick={() => fetchDashboard()} size="sm">Try Again</Button>
      </div>
    );
  }

  // Compute values
  const engTotal = (data.engagement.distribution.low || 0) + (data.engagement.distribution.medium || 0) + (data.engagement.distribution.high || 0) + (data.engagement.distribution.excellent || 0);
  const totalPipelineStudents = Object.values(data.lifecycle.stage_counts).reduce((s, c) => s + c, 0);
  const riskTotal = Object.values(data.risk.level_counts).reduce((s, c) => s + c, 0);

  const kpiCards = [
    { label: 'Total Students', value: data.total_students.toLocaleString(), sub: 'tracked in CRM' },
    { label: 'Avg Engagement', value: `${data.engagement.average_score}%`, sub: `${data.engagement.scored_students} scored` },
    { label: 'At-Risk Students', value: data.risk.at_risk_count.toString(), sub: 'require action' },
    { label: 'Pending Tasks', value: data.tasks.pending.toString(), sub: data.tasks.overdue > 0 ? `${data.tasks.overdue} overdue` : 'assigned to team' },
    { label: 'Active Segments', value: data.segments.total.toString(), sub: 'auto-evaluated' },
    { label: 'Live Workflows', value: data.workflows.active.toString(), sub: `${data.workflows.total_executions} runs` },
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
    <div className="space-y-5">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              {k.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono leading-none mb-1">
              {k.value}
            </div>
            <div className="text-[10px] text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* LIFECYCLE PIPELINE SECTION */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
          Lifecycle Pipeline
        </span>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
          {totalPipelineStudents.toLocaleString()} total
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = data.lifecycle.stage_counts[stage.key] || 0;
            const pct = totalPipelineStudents > 0 ? ((count / totalPipelineStudents) * 100).toFixed(1) : '0.0';
            return (
              <Link
                key={stage.key}
                href={`/crm/pipeline?stage=${stage.key}`}
                className="flex-1 p-3 relative overflow-hidden no-underline hover:bg-gray-50 transition-colors border-r border-gray-100 last:border-r-0"
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1.5">
                  {stage.label}
                </div>
                <div className="text-xl font-bold text-gray-900 font-mono leading-none mb-1">
                  {count.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">{pct}%</div>
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: stage.color }} />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ENGAGEMENT & ACTIVITY SECTION */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
          Engagement & Activity
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ENGAGEMENT DISTRIBUTION */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-baseline justify-between">
            <h3 className="text-sm font-display text-gray-900">Engagement Distribution</h3>
            <span className="text-[10px] text-gray-400 font-mono">{engTotal.toLocaleString()} students</span>
          </div>
          <div className="p-4 space-y-3">
            {engLevels.map(e => (
              <div key={e.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-gray-900 flex-1">{e.label}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{e.range}</span>
                  <span className="text-xs font-medium text-gray-900 font-mono min-w-[36px] text-right">{e.count.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 font-mono min-w-[30px] text-right">{e.pct}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${e.pct}%`, background: e.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RISK DISTRIBUTION */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-baseline justify-between">
            <h3 className="text-sm font-display text-gray-900">Risk Distribution</h3>
            <span className="text-[10px] text-gray-400 font-mono">current cohort</span>
          </div>
          <div className="p-4">
            <div className="space-y-2.5">
              {riskLevels.map(r => (
                <div key={r.key} className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-gray-900 w-14">{r.label}</span>
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(r.pct * 1.3, 100)}%`, background: r.color }} />
                  </div>
                  <span className="text-xs font-medium font-mono min-w-[36px] text-right" style={{ color: r.color }}>{r.count.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 font-mono min-w-[32px] text-right">{r.pct}%</span>
                </div>
              ))}
            </div>

            {/* Stacked bar */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1 rounded-full overflow-hidden">
              {riskLevels.map(r => (
                <div key={r.key} className="h-1.5 rounded-full" style={{ flex: r.pct || 1, background: r.color }} title={`${r.label}: ${r.pct}%`} />
              ))}
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-baseline justify-between">
            <h3 className="text-sm font-display text-gray-900">Recent Activity</h3>
            <span className="text-[10px] text-gray-400 font-mono">last {Math.min(data.recent_interactions.length, 6)} events</span>
          </div>
          <div className="px-4">
            {data.recent_interactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-400">No recent interactions.</p>
              </div>
            ) : (
              data.recent_interactions.slice(0, 6).map((interaction, i) => (
                <div
                  key={interaction.id}
                  className={`flex items-start gap-3 py-2.5 ${i < Math.min(data.recent_interactions.length, 6) - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <span className={`text-[9px] font-mono font-medium tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${TYPE_COLORS[interaction.type] || TYPE_COLORS.note}`}>
                    {TYPE_LABELS[interaction.type] || 'NOTE'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 mb-0.5">
                      {interaction.created_by_name || 'System'}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {interaction.subject}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 mt-0.5">
                    {timeAgo(interaction.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER META */}
      <div className="flex items-center gap-5 pt-3 border-t border-gray-200 mt-2">
        <span className="text-[10px] text-gray-400 font-mono tracking-wide">
          OECS Virtual Campus · Student Engagement CRM · Data current as of today {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} AST
        </span>
        <span className="ml-auto text-[10px] text-gray-400 font-mono">
          7 member states · AY 2025–26
        </span>
      </div>
    </div>
  );
}
