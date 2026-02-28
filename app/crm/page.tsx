'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

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

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  prospect: { label: 'Prospect', color: 'text-slate-600', bgColor: 'bg-slate-100', icon: 'mdi:account-question' },
  onboarding: { label: 'Onboarding', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'mdi:account-clock' },
  active: { label: 'Active', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: 'mdi:account-check' },
  at_risk: { label: 'At Risk', color: 'text-red-600', bgColor: 'bg-red-100', icon: 'mdi:account-alert' },
  re_engagement: { label: 'Re-Engage', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: 'mdi:account-reactivate' },
  completing: { label: 'Completing', color: 'text-violet-600', bgColor: 'bg-violet-100', icon: 'mdi:account-star' },
  alumni: { label: 'Alumni', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: 'mdi:school' },
};

const INTERACTION_ICONS: Record<string, { icon: string; color: string }> = {
  note: { icon: 'mdi:note-text', color: 'text-blue-500 bg-blue-50' },
  email: { icon: 'mdi:email', color: 'text-emerald-500 bg-emerald-50' },
  call: { icon: 'mdi:phone', color: 'text-amber-500 bg-amber-50' },
  meeting: { icon: 'mdi:calendar-account', color: 'text-violet-500 bg-violet-50' },
  intervention: { icon: 'mdi:hand-heart', color: 'text-rose-500 bg-rose-50' },
  system: { icon: 'mdi:robot', color: 'text-slate-500 bg-slate-50' },
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
      <>
        {/* Skeleton Header */}
        <div className="relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-oecs-navy-blue via-blue-800 to-indigo-900" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Ccircle cx='40' cy='40' r='16'/%3E%3Ccircle cx='40' cy='40' r='8'/%3E%3Cline x1='0' y1='40' x2='24' y2='40'/%3E%3Cline x1='56' y1='40' x2='80' y2='40'/%3E%3Cline x1='40' y1='0' x2='40' y2='24'/%3E%3Cline x1='40' y1='56' x2='40' y2='80'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="absolute right-0 top-0 w-[560px] h-full opacity-[0.22] pointer-events-none">
            <svg viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect x="330" y="25" width="200" height="140" rx="4" stroke="white" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
              <rect x="345" y="42" width="80" height="5" fill="white" fillOpacity="0.25" />
              <rect x="345" y="52" width="50" height="3" fill="white" fillOpacity="0.15" />
              <rect x="345" y="115" width="20" height="35" fill="white" fillOpacity="0.35" />
              <rect x="372" y="95" width="20" height="55" fill="white" fillOpacity="0.5" />
              <rect x="399" y="105" width="20" height="45" fill="white" fillOpacity="0.35" />
              <rect x="426" y="80" width="20" height="70" fill="white" fillOpacity="0.6" />
              <rect x="453" y="90" width="20" height="60" fill="white" fillOpacity="0.4" />
              <rect x="480" y="75" width="20" height="75" fill="white" fillOpacity="0.55" />
              <polyline points="355,73 382,66 409,70 436,58 463,53 490,48" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="490" cy="48" r="3.5" fill="white" fillOpacity="0.7" />
              <circle cx="150" cy="95" r="30" stroke="white" strokeWidth="2" />
              <circle cx="150" cy="84" r="9" fill="white" fillOpacity="0.5" />
              <path d="M133 107 Q150 118 167 107" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="248" cy="50" r="24" stroke="white" strokeWidth="1.5" />
              <circle cx="248" cy="41" r="7" fill="white" fillOpacity="0.45" />
              <path d="M235 57 Q248 66 261 57" stroke="white" strokeWidth="1.2" fill="none" />
              <circle cx="75" cy="175" r="26" stroke="white" strokeWidth="1.5" />
              <circle cx="75" cy="166" r="8" fill="white" fillOpacity="0.45" />
              <path d="M60 183 Q75 192 90 183" stroke="white" strokeWidth="1.2" fill="none" />
              <circle cx="215" cy="200" r="22" stroke="white" strokeWidth="1.3" />
              <circle cx="215" cy="192" r="6.5" fill="white" fillOpacity="0.4" />
              <path d="M203 206 Q215 214 227 206" stroke="white" strokeWidth="1.1" fill="none" />
              <circle cx="300" cy="148" r="20" stroke="white" strokeWidth="1.2" />
              <circle cx="300" cy="141" r="6" fill="white" fillOpacity="0.4" />
              <path d="M289 154 Q300 161 311 154" stroke="white" strokeWidth="1" fill="none" />
              <line x1="150" y1="95" x2="248" y2="50" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="75" y2="175" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="215" y2="200" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="300" y2="148" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="248" y1="50" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="215" y1="200" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="75" y1="175" x2="215" y2="200" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="300" y1="148" x2="330" y2="95" stroke="white" strokeWidth="0.8" opacity="0.3" strokeDasharray="5 4" />
              <circle cx="150" cy="95" r="42" stroke="white" strokeWidth="0.6" opacity="0.3" />
              <circle cx="150" cy="95" r="56" stroke="white" strokeWidth="0.3" opacity="0.15" />
            </svg>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="h-8 w-48 bg-white/20 rounded-none animate-pulse mb-2" />
            <div className="h-4 w-80 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Skeleton KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-none border border-gray-100 p-5 shadow-sm">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Skeleton sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-none border border-gray-100 p-6 shadow-sm h-48 animate-pulse" />
            <div className="bg-white rounded-none border border-gray-100 p-6 shadow-sm h-48 animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-oecs-navy-blue via-blue-800 to-indigo-900" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Ccircle cx='40' cy='40' r='16'/%3E%3Ccircle cx='40' cy='40' r='8'/%3E%3Cline x1='0' y1='40' x2='24' y2='40'/%3E%3Cline x1='56' y1='40' x2='80' y2='40'/%3E%3Cline x1='40' y1='0' x2='40' y2='24'/%3E%3Cline x1='40' y1='56' x2='40' y2='80'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="absolute right-0 top-0 w-[560px] h-full opacity-[0.22] pointer-events-none">
            <svg viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect x="330" y="25" width="200" height="140" rx="4" stroke="white" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
              <rect x="345" y="42" width="80" height="5" fill="white" fillOpacity="0.25" />
              <rect x="345" y="52" width="50" height="3" fill="white" fillOpacity="0.15" />
              <rect x="345" y="115" width="20" height="35" fill="white" fillOpacity="0.35" />
              <rect x="372" y="95" width="20" height="55" fill="white" fillOpacity="0.5" />
              <rect x="399" y="105" width="20" height="45" fill="white" fillOpacity="0.35" />
              <rect x="426" y="80" width="20" height="70" fill="white" fillOpacity="0.6" />
              <rect x="453" y="90" width="20" height="60" fill="white" fillOpacity="0.4" />
              <rect x="480" y="75" width="20" height="75" fill="white" fillOpacity="0.55" />
              <polyline points="355,73 382,66 409,70 436,58 463,53 490,48" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="490" cy="48" r="3.5" fill="white" fillOpacity="0.7" />
              <circle cx="150" cy="95" r="30" stroke="white" strokeWidth="2" />
              <circle cx="150" cy="84" r="9" fill="white" fillOpacity="0.5" />
              <path d="M133 107 Q150 118 167 107" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="248" cy="50" r="24" stroke="white" strokeWidth="1.5" />
              <circle cx="248" cy="41" r="7" fill="white" fillOpacity="0.45" />
              <path d="M235 57 Q248 66 261 57" stroke="white" strokeWidth="1.2" fill="none" />
              <circle cx="75" cy="175" r="26" stroke="white" strokeWidth="1.5" />
              <circle cx="75" cy="166" r="8" fill="white" fillOpacity="0.45" />
              <path d="M60 183 Q75 192 90 183" stroke="white" strokeWidth="1.2" fill="none" />
              <circle cx="215" cy="200" r="22" stroke="white" strokeWidth="1.3" />
              <circle cx="215" cy="192" r="6.5" fill="white" fillOpacity="0.4" />
              <path d="M203 206 Q215 214 227 206" stroke="white" strokeWidth="1.1" fill="none" />
              <circle cx="300" cy="148" r="20" stroke="white" strokeWidth="1.2" />
              <circle cx="300" cy="141" r="6" fill="white" fillOpacity="0.4" />
              <path d="M289 154 Q300 161 311 154" stroke="white" strokeWidth="1" fill="none" />
              <line x1="150" y1="95" x2="248" y2="50" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="75" y2="175" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="215" y2="200" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="150" y1="95" x2="300" y2="148" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="248" y1="50" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="215" y1="200" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="75" y1="175" x2="215" y2="200" stroke="white" strokeWidth="1" opacity="0.4" />
              <line x1="300" y1="148" x2="330" y2="95" stroke="white" strokeWidth="0.8" opacity="0.3" strokeDasharray="5 4" />
              <circle cx="150" cy="95" r="42" stroke="white" strokeWidth="0.6" opacity="0.3" />
              <circle cx="150" cy="95" r="56" stroke="white" strokeWidth="0.3" opacity="0.15" />
            </svg>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/10 rounded-none flex items-center justify-center backdrop-blur-sm">
                <Icon icon="mdi:account-heart" className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Student CRM</h1>
            </div>
            <p className="text-blue-200/80 text-sm">Manage student relationships, track engagement, and drive outcomes.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-none flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load dashboard</h2>
            <p className="text-gray-500 mb-6">Something went wrong while loading the CRM dashboard data.</p>
            <button
              onClick={() => fetchDashboard()}
              className="px-5 py-2.5 bg-oecs-navy-blue text-white rounded-none font-medium hover:bg-blue-900 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  const engTotal = data.engagement.distribution.low + data.engagement.distribution.medium + data.engagement.distribution.high + data.engagement.distribution.excellent;

  const kpiCards = [
    { label: 'Total Students', value: data.total_students, icon: 'mdi:account-group', color: 'border-l-blue-500', iconColor: 'text-blue-500 bg-blue-50' },
    { label: 'Avg Engagement', value: data.engagement.average_score, icon: 'mdi:chart-line', color: 'border-l-emerald-500', iconColor: 'text-emerald-500 bg-emerald-50' },
    { label: 'At Risk', value: data.risk.at_risk_count, icon: 'mdi:alert-circle', color: 'border-l-red-500', iconColor: 'text-red-500 bg-red-50' },
    { label: 'Pending Tasks', value: data.tasks.pending, icon: 'mdi:clipboard-check', color: 'border-l-amber-500', iconColor: 'text-amber-500 bg-amber-50', sub: data.tasks.overdue > 0 ? `${data.tasks.overdue} overdue` : undefined },
    { label: 'Segments', value: data.segments.total, icon: 'mdi:account-multiple-check', color: 'border-l-violet-500', iconColor: 'text-violet-500 bg-violet-50' },
    { label: 'Workflows', value: data.workflows.active, icon: 'mdi:robot', color: 'border-l-indigo-500', iconColor: 'text-indigo-500 bg-indigo-50', sub: `${data.workflows.total_executions} runs` },
  ];

  return (
    <>
      {/* Header */}
      <div className="relative overflow-hidden text-white">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-oecs-navy-blue via-blue-800 to-indigo-900" />
        {/* Subtle repeating pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Ccircle cx='40' cy='40' r='16'/%3E%3Ccircle cx='40' cy='40' r='8'/%3E%3Cline x1='0' y1='40' x2='24' y2='40'/%3E%3Cline x1='56' y1='40' x2='80' y2='40'/%3E%3Cline x1='40' y1='0' x2='40' y2='24'/%3E%3Cline x1='40' y1='56' x2='40' y2='80'/%3E%3C/g%3E%3C/svg%3E")` }} />
        {/* Prominent CRM Illustration */}
        <div className="absolute right-0 top-0 w-[560px] h-full opacity-[0.22] pointer-events-none">
          <svg viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="330" y="25" width="200" height="140" rx="4" stroke="white" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
            <rect x="345" y="42" width="80" height="5" fill="white" fillOpacity="0.25" />
            <rect x="345" y="52" width="50" height="3" fill="white" fillOpacity="0.15" />
            <rect x="345" y="115" width="20" height="35" fill="white" fillOpacity="0.35" />
            <rect x="372" y="95" width="20" height="55" fill="white" fillOpacity="0.5" />
            <rect x="399" y="105" width="20" height="45" fill="white" fillOpacity="0.35" />
            <rect x="426" y="80" width="20" height="70" fill="white" fillOpacity="0.6" />
            <rect x="453" y="90" width="20" height="60" fill="white" fillOpacity="0.4" />
            <rect x="480" y="75" width="20" height="75" fill="white" fillOpacity="0.55" />
            <polyline points="355,73 382,66 409,70 436,58 463,53 490,48" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="490" cy="48" r="3.5" fill="white" fillOpacity="0.7" />
            <circle cx="150" cy="95" r="30" stroke="white" strokeWidth="2" />
            <circle cx="150" cy="84" r="9" fill="white" fillOpacity="0.5" />
            <path d="M133 107 Q150 118 167 107" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="248" cy="50" r="24" stroke="white" strokeWidth="1.5" />
            <circle cx="248" cy="41" r="7" fill="white" fillOpacity="0.45" />
            <path d="M235 57 Q248 66 261 57" stroke="white" strokeWidth="1.2" fill="none" />
            <circle cx="75" cy="175" r="26" stroke="white" strokeWidth="1.5" />
            <circle cx="75" cy="166" r="8" fill="white" fillOpacity="0.45" />
            <path d="M60 183 Q75 192 90 183" stroke="white" strokeWidth="1.2" fill="none" />
            <circle cx="215" cy="200" r="22" stroke="white" strokeWidth="1.3" />
            <circle cx="215" cy="192" r="6.5" fill="white" fillOpacity="0.4" />
            <path d="M203 206 Q215 214 227 206" stroke="white" strokeWidth="1.1" fill="none" />
            <circle cx="300" cy="148" r="20" stroke="white" strokeWidth="1.2" />
            <circle cx="300" cy="141" r="6" fill="white" fillOpacity="0.4" />
            <path d="M289 154 Q300 161 311 154" stroke="white" strokeWidth="1" fill="none" />
            <line x1="150" y1="95" x2="248" y2="50" stroke="white" strokeWidth="1.2" opacity="0.5" />
            <line x1="150" y1="95" x2="75" y2="175" stroke="white" strokeWidth="1.2" opacity="0.5" />
            <line x1="150" y1="95" x2="215" y2="200" stroke="white" strokeWidth="1.2" opacity="0.5" />
            <line x1="150" y1="95" x2="300" y2="148" stroke="white" strokeWidth="1.2" opacity="0.5" />
            <line x1="248" y1="50" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="215" y1="200" x2="300" y2="148" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="75" y1="175" x2="215" y2="200" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="300" y1="148" x2="330" y2="95" stroke="white" strokeWidth="0.8" opacity="0.3" strokeDasharray="5 4" />
            <circle cx="150" cy="95" r="42" stroke="white" strokeWidth="0.6" opacity="0.3" />
            <circle cx="150" cy="95" r="56" stroke="white" strokeWidth="0.3" opacity="0.15" />
          </svg>
        </div>
        {/* Decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl" />
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/10 rounded-none flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Icon icon="mdi:account-heart" className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Student CRM</h1>
              </div>
              <p className="text-blue-200/80 text-sm">Manage student relationships, track engagement, and drive outcomes.</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link href="/crm/segments/create" className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-none text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/10">
                New Segment
              </Link>
              <Link href="/crm/communications/create" className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-none text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/10">
                New Campaign
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((kpi, i) => (
            <div key={i} className={`bg-white rounded-none border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${kpi.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`w-7 h-7 rounded-none flex items-center justify-center ${kpi.iconColor}`}>
                  <Icon icon={kpi.icon} className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              {kpi.sub && <div className="text-xs text-red-500 mt-0.5 font-medium">{kpi.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Lifecycle Pipeline */}
          <div className="lg:col-span-2 bg-white rounded-none border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Lifecycle Pipeline</h2>
              <Link href="/crm/pipeline" className="text-sm text-oecs-navy-blue hover:text-blue-900 font-semibold flex items-center gap-1 transition-colors">
                View Board <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {Object.entries(STAGE_CONFIG).map(([key, config]) => {
                const count = data.lifecycle.stage_counts[key] || 0;
                return (
                  <Link key={key} href={`/crm/pipeline?stage=${key}`} className="text-center p-3 rounded-none border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                    <div className={`w-10 h-10 ${config.bgColor} rounded-none flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon icon={config.icon} className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 font-medium">{config.label}</div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Engagement Distribution */}
          <div className="bg-white rounded-none border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Engagement</h2>
            <div className="space-y-4">
              {[
                { key: 'excellent', label: 'Excellent (80+)', color: 'from-emerald-400 to-emerald-500', textColor: 'text-emerald-600', count: data.engagement.distribution.excellent },
                { key: 'high', label: 'High (60-79)', color: 'from-blue-400 to-blue-500', textColor: 'text-blue-600', count: data.engagement.distribution.high },
                { key: 'medium', label: 'Medium (30-59)', color: 'from-amber-400 to-amber-500', textColor: 'text-amber-600', count: data.engagement.distribution.medium },
                { key: 'low', label: 'Low (<30)', color: 'from-red-400 to-red-500', textColor: 'text-red-600', count: data.engagement.distribution.low },
              ].map(item => {
                const pct = engTotal > 0 ? Math.round((item.count / engTotal) * 100) : 0;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.textColor}`}>{item.count}</span>
                        <span className="text-gray-400 text-xs">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${item.color} rounded-full h-2.5 transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Interactions */}
          <div className="bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
              <Link href="/crm/students" className="text-xs text-oecs-navy-blue hover:text-blue-900 font-semibold transition-colors">View All</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {data.recent_interactions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-none flex items-center justify-center mx-auto mb-3">
                    <Icon icon="mdi:message-text" className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No recent interactions.</p>
                </div>
              ) : (
                data.recent_interactions.slice(0, 6).map(interaction => {
                  const interactionConfig = INTERACTION_ICONS[interaction.type] || INTERACTION_ICONS.note;
                  return (
                    <div key={interaction.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-blue-50/30 transition-colors">
                      <div className={`w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0 ${interactionConfig.color}`}>
                        <Icon icon={interactionConfig.icon} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{interaction.subject}</p>
                        <p className="text-xs text-gray-500">
                          {interaction.created_by_name || 'System'} &middot; {timeAgo(interaction.created_at)}
                        </p>
                      </div>
                      <Link href={`/crm/students/${interaction.student_id}`} className="text-xs text-oecs-navy-blue hover:text-blue-900 font-semibold flex-shrink-0 transition-colors">
                        View
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="bg-white rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Risk Distribution</h2>
            </div>
            <div className="p-5 space-y-5">
              {[
                { key: 'low', label: 'Low Risk', color: 'bg-emerald-500', dotColor: 'bg-emerald-400', textColor: 'text-emerald-600' },
                { key: 'medium', label: 'Medium Risk', color: 'bg-amber-500', dotColor: 'bg-amber-400', textColor: 'text-amber-600' },
                { key: 'high', label: 'High Risk', color: 'bg-orange-500', dotColor: 'bg-orange-400', textColor: 'text-orange-600' },
                { key: 'critical', label: 'Critical', color: 'bg-red-500', dotColor: 'bg-red-400', textColor: 'text-red-600' },
              ].map(item => {
                const count = data.risk.level_counts[item.key] || 0;
                const total = Object.values(data.risk.level_counts).reduce((s, c) => s + c, 0);
                const pct = total > 0 ? Math.round(count / total * 100) : 0;
                return (
                  <div key={item.key} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.dotColor} flex-shrink-0 ring-2 ring-offset-2 ring-${item.key === 'low' ? 'emerald' : item.key === 'medium' ? 'amber' : item.key === 'high' ? 'orange' : 'red'}-100`} />
                    <span className="text-sm text-gray-600 flex-1 font-medium">{item.label}</span>
                    <span className={`text-sm font-bold ${item.textColor}`}>{count}</span>
                    <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`${item.color} rounded-full h-1.5`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right font-medium">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
