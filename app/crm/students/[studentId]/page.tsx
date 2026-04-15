'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface Student360 {
  profile: {
    id: string; name: string; email: string; role: string;
    gender: string | null; avatar: string | null; bio: string | null;
    learning_preferences: Record<string, any>; created_at: string;
  };
  lifecycle: {
    current_stage: string | null; stage_changed_at: string | null;
    history: Array<{ stage: string; previous_stage: string | null; stage_changed_at: string; changed_by: string | null; change_reason: string | null; }>;
  };
  enrollments: Array<{ course_id: string; course_title: string; status: string; progress_percentage: number; enrolled_at: string; }>;
  academic: { total_courses: number; completed_courses: number; average_grade: number | null; };
  risk: { risk_level: string | null; risk_score: number | null; factors: Record<string, any>; };
  recent_interactions: Array<{ id: string; interaction_type: string; subject: string; body?: string; created_by_name: string | null; created_at: string; }>;
  ai_insights: Array<{ id: string; insight_type: string; insight: string; confidence: number; is_actionable: boolean; created_at: string; }>;
  activity_summary: { total_activities: number; last_7_days: number; last_30_days: number; last_activity_at: string | null; };
}

const STAGE_BADGES: Record<string, { label: string; color: string }> = {
  prospect: { label: 'Prospect', color: 'bg-gray-200/80 text-gray-800 font-semibold' },
  onboarding: { label: 'Onboarding', color: 'bg-blue-200/80 text-blue-900 font-semibold' },
  active: { label: 'Active', color: 'bg-emerald-200/80 text-emerald-900 font-semibold' },
  at_risk: { label: 'At Risk', color: 'bg-red-200/80 text-red-900 font-semibold' },
  re_engagement: { label: 'Re-Engagement', color: 'bg-amber-200/80 text-amber-900 font-semibold' },
  completing: { label: 'Completing', color: 'bg-purple-200/80 text-purple-900 font-semibold' },
  alumni: { label: 'Alumni', color: 'bg-indigo-200/80 text-indigo-900 font-semibold' },
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-600', medium: 'text-yellow-600', high: 'text-orange-600', critical: 'text-red-600',
};

const RISK_STROKE_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#eab308', high: '#f97316', critical: '#ef4444',
};

const INTERACTION_ICONS: Record<string, string> = {
  note: 'mdi:note-text', email: 'mdi:email', call: 'mdi:phone', meeting: 'mdi:video', intervention: 'mdi:hand-heart', system: 'mdi:cog',
};

const INTERACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  note: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-blue-500' },
  email: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-l-emerald-500' },
  call: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-amber-500' },
  meeting: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-l-violet-500' },
  intervention: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-l-rose-500' },
  system: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-l-slate-400' },
};

type TabKey = 'overview' | 'enrollments' | 'interactions' | 'insights';

export default function Student360Page() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;
  const { showToast } = useToast();

  const [data, setData] = useState<Student360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ interaction_type: 'note', subject: '', body: '', is_private: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/student/${studentId}/360`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) { router.push('/dashboard'); return; }
        showToast('Failed to load student data', 'error');
        return;
      }
      setData(await res.json());
    } catch (error) {
      console.error('Student 360: Error', error);
      showToast('Failed to load student data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addInteraction = async () => {
    if (!newInteraction.subject.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, ...newInteraction }),
      });
      if (res.ok) {
        setShowAddInteraction(false);
        setNewInteraction({ interaction_type: 'note', subject: '', body: '', is_private: false });
        showToast('Interaction saved', 'success');
        fetchData();
      } else {
        showToast('Failed to save interaction', 'error');
      }
    } catch (error) {
      console.error('Add interaction error:', error);
      showToast('Failed to save interaction', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading || !data) {
    return (
      <div>
        {/* Skeleton Header */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 w-5 rounded bg-white/20 animate-pulse" />
              <div className="h-4 w-28 rounded bg-white/20 animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-white/20 animate-pulse" />
                <div className="h-4 w-36 rounded bg-white/10 animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton Tabs */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex gap-6 py-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
    { key: 'enrollments', label: 'Enrollments', icon: 'mdi:school' },
    { key: 'interactions', label: 'Interactions', icon: 'mdi:message-text' },
    { key: 'insights', label: 'AI Insights', icon: 'mdi:lightbulb' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <Link href="/crm/students" className="text-blue-200/80 hover:text-white transition-colors text-sm font-medium">
              Back to Students
            </Link>
          </div>
          <div className="flex items-center gap-5">
            {data.profile.avatar ? (
              <img src={data.profile.avatar} alt="" className="w-[4.5rem] h-[4.5rem] rounded-full border-2 border-white/30 shadow-lg" />
            ) : (
              <div className="w-[4.5rem] h-[4.5rem] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border border-white/10">
                {data.profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{data.profile.name}</h1>
              <p className="text-blue-200/80 mt-0.5">{data.profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {data.lifecycle.current_stage && STAGE_BADGES[data.lifecycle.current_stage] && (
                  <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${STAGE_BADGES[data.lifecycle.current_stage].color}`}>
                    {STAGE_BADGES[data.lifecycle.current_stage].label}
                  </span>
                )}
                {data.risk.risk_level && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm">
                    Risk: {data.risk.risk_level} ({data.risk.risk_score})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Academic Summary */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-5">Academic Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="relative overflow-hidden text-center p-5 bg-blue-50/70 rounded-lg border-t-[3px] border-t-blue-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon icon="mdi:book-open-page-variant" className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{data.academic.total_courses}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">Total Courses</div>
                  </div>
                  <div className="relative overflow-hidden text-center p-5 bg-emerald-50/70 rounded-lg border-t-[3px] border-t-emerald-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700">{data.academic.completed_courses}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">Completed</div>
                  </div>
                  <div className="relative overflow-hidden text-center p-5 bg-violet-50/70 rounded-lg border-t-[3px] border-t-violet-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Icon icon="mdi:chart-bar" className="w-4 h-4 text-violet-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-violet-700">{data.academic.average_grade != null ? `${data.academic.average_grade}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">Avg Grade</div>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-5">Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:lightning-bolt" className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">{data.activity_summary.total_activities}</div>
                      <div className="text-xs text-gray-500 font-medium">Total Activities</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:calendar-week" className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">{data.activity_summary.last_7_days}</div>
                      <div className="text-xs text-gray-500 font-medium">Last 7 Days</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:calendar-month" className="w-4.5 h-4.5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">{data.activity_summary.last_30_days}</div>
                      <div className="text-xs text-gray-500 font-medium">Last 30 Days</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:clock-check" className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {data.activity_summary.last_activity_at ? formatDate(data.activity_summary.last_activity_at) : 'Never'}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">Last Active</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Interactions */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Interactions</h3>
                  <button
                    onClick={() => setShowAddInteraction(true)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    + Add Note
                  </button>
                </div>
                {data.recent_interactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Icon icon="mdi:message-text-outline" className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm">No interactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recent_interactions.map(interaction => {
                      const colors = INTERACTION_COLORS[interaction.interaction_type] || INTERACTION_COLORS.note;
                      return (
                        <div key={interaction.id} className={`flex gap-3 p-3.5 rounded-lg border-l-[3px] ${colors.border} bg-gray-50/50 hover:bg-gray-50 transition-colors`}>
                          <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon icon={INTERACTION_ICONS[interaction.interaction_type] || 'mdi:note'} className={`w-4.5 h-4.5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{interaction.subject}</div>
                            {interaction.body && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">{interaction.body}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              {interaction.created_by_name || 'System'} &middot; {formatDateTime(interaction.created_at)}
                            </div>
                          </div>
                          <span className={`self-start px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
                            {interaction.interaction_type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
                <dl className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:account" className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <dt className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Gender</dt>
                      <dd className="text-sm text-gray-900 capitalize">{data.profile.gender || 'Not specified'}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon="mdi:calendar" className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <dt className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Joined</dt>
                      <dd className="text-sm text-gray-900">{formatDate(data.profile.created_at)}</dd>
                    </div>
                  </div>
                  {data.profile.bio && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon icon="mdi:text" className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <dt className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Bio</dt>
                        <dd className="text-sm text-gray-900">{data.profile.bio}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {/* Lifecycle History */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lifecycle History</h3>
                {data.lifecycle.history.length === 0 ? (
                  <p className="text-gray-400 text-sm">No lifecycle data yet.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-700/30 via-blue-300/20 to-transparent"></div>
                    <div className="space-y-5">
                      {data.lifecycle.history.slice(0, 10).map((entry, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className="absolute left-1 top-1 w-[14px] h-[14px] rounded-full bg-blue-600 border-[3px] border-white shadow-sm"></div>
                          <div className="text-sm font-semibold text-gray-900 capitalize">
                            {entry.stage.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDateTime(entry.stage_changed_at)}
                          </div>
                          {entry.change_reason && (
                            <div className="text-xs text-gray-400 mt-1 italic">{entry.change_reason}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Assessment */}
              {data.risk.risk_score != null && (
                <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-5">Risk Assessment</h3>
                  <div className="flex flex-col items-center mb-5">
                    <div className="relative">
                      <svg className="w-24 h-24" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke={RISK_STROKE_COLORS[data.risk.risk_level || ''] || '#9ca3af'}
                          strokeWidth="8"
                          strokeDasharray={`${((data.risk.risk_score || 0) / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-bold ${RISK_COLORS[data.risk.risk_level || ''] || 'text-gray-600'}`}>
                          {data.risk.risk_score}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 capitalize mt-2 font-medium">{data.risk.risk_level} risk</div>
                  </div>
                  {Object.keys(data.risk.factors).length > 0 && (
                    <div className="space-y-2.5 pt-4 border-t border-gray-100">
                      {Object.entries(data.risk.factors).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-gray-900">{typeof value === 'number' ? Math.round(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENROLLMENTS TAB */}
        {activeTab === 'enrollments' && (
          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.enrollments.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No enrollments.</td></tr>
                ) : (
                  data.enrollments.map(e => (
                    <tr key={e.course_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{e.course_title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          e.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          e.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${e.progress_percentage}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{e.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(e.enrolled_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* INTERACTIONS TAB */}
        {activeTab === 'interactions' && (
          <div>
            <div className="flex justify-end mb-5">
              <button
                onClick={() => setShowAddInteraction(true)}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
              >
                + Add Interaction
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
              {data.recent_interactions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="mdi:message-text-outline" className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No interactions logged yet.</p>
                  <p className="text-gray-300 text-sm mt-1">Add your first interaction to start tracking.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.recent_interactions.map(i => {
                    const colors = INTERACTION_COLORS[i.interaction_type] || INTERACTION_COLORS.note;
                    return (
                      <div key={i.id} className="p-5 flex gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon icon={INTERACTION_ICONS[i.interaction_type] || 'mdi:note'} className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{i.subject}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
                              {i.interaction_type}
                            </span>
                          </div>
                          {i.body && (
                            <div className="text-xs text-gray-400 mb-1 truncate">{i.body}</div>
                          )}
                          <div className="text-xs text-gray-400">
                            {i.created_by_name || 'System'} &middot; {formatDateTime(i.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {data.ai_insights.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <Icon icon="mdi:lightbulb-outline" className="w-8 h-8 text-amber-300" />
                </div>
                <p className="text-gray-400 font-medium">No AI insights available for this student.</p>
                <p className="text-gray-300 text-sm mt-1">Insights will appear as the system gathers more data.</p>
              </div>
            ) : (
              data.ai_insights.map(insight => (
                <div key={insight.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      insight.insight_type === 'risk_alert' ? 'bg-red-50' :
                      insight.insight_type === 'engagement' ? 'bg-blue-50' : 'bg-amber-50'
                    }`}>
                      <Icon
                        icon={insight.insight_type === 'risk_alert' ? 'mdi:alert-circle' : insight.insight_type === 'engagement' ? 'mdi:chart-line' : 'mdi:lightbulb'}
                        className={`w-5 h-5 ${
                          insight.insight_type === 'risk_alert' ? 'text-red-500' : insight.insight_type === 'engagement' ? 'text-blue-500' : 'text-amber-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-900 leading-relaxed">{insight.insight}</div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-semibold uppercase tracking-wide text-gray-500">{insight.insight_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">Confidence: {Math.round(insight.confidence * 100)}%</span>
                        <span className="text-xs text-gray-400">{formatDate(insight.created_at)}</span>
                        {insight.is_actionable && (
                          <span className="px-2 py-0.5 bg-blue-600/10 text-blue-600 rounded-md text-[10px] font-semibold uppercase tracking-wide">Actionable</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Interaction Modal */}
      {showAddInteraction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Interaction</h3>
              <button onClick={() => setShowAddInteraction(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={newInteraction.interaction_type}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, interaction_type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="note">Note</option>
                  <option value="email">Email</option>
                  <option value="call">Phone Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="intervention">Intervention</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={newInteraction.subject}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="Brief summary..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Details (optional)</label>
                <textarea
                  rows={4}
                  value={newInteraction.body}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 resize-none"
                  placeholder="Additional details..."
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newInteraction.is_private}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, is_private: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                />
                <span className="text-sm text-gray-600">Private (hidden from student)</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowAddInteraction(false)}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addInteraction}
                disabled={saving || !newInteraction.subject.trim()}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Interaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
