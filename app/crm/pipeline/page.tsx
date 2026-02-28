'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useToast } from '@/app/components/ui/Toast';

interface StudentCard {
  student_id: string;
  student_name: string;
  email: string;
  stage: string | null;
  stage_changed_at: string | null;
  risk_level: string | null;
  risk_score: number | null;
}

const STAGES = [
  { key: 'prospect', label: 'Prospect', borderColor: 'border-t-slate-400', headerBg: 'bg-gradient-to-r from-slate-50 to-slate-100', accentBg: 'border-l-slate-400', icon: 'mdi:account-question', iconBg: 'bg-slate-100 text-slate-600', countBg: 'bg-slate-200 text-slate-700' },
  { key: 'onboarding', label: 'Onboarding', borderColor: 'border-t-blue-500', headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100', accentBg: 'border-l-blue-400', icon: 'mdi:account-clock', iconBg: 'bg-blue-100 text-blue-600', countBg: 'bg-blue-200 text-blue-700' },
  { key: 'active', label: 'Active', borderColor: 'border-t-emerald-500', headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100', accentBg: 'border-l-emerald-400', icon: 'mdi:account-check', iconBg: 'bg-emerald-100 text-emerald-600', countBg: 'bg-emerald-200 text-emerald-700' },
  { key: 'at_risk', label: 'At Risk', borderColor: 'border-t-red-500', headerBg: 'bg-gradient-to-r from-red-50 to-red-100', accentBg: 'border-l-red-400', icon: 'mdi:account-alert', iconBg: 'bg-red-100 text-red-600', countBg: 'bg-red-200 text-red-700' },
  { key: 're_engagement', label: 'Re-Engage', borderColor: 'border-t-amber-500', headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100', accentBg: 'border-l-amber-400', icon: 'mdi:account-reactivate', iconBg: 'bg-amber-100 text-amber-600', countBg: 'bg-amber-200 text-amber-700' },
  { key: 'completing', label: 'Completing', borderColor: 'border-t-violet-500', headerBg: 'bg-gradient-to-r from-violet-50 to-violet-100', accentBg: 'border-l-violet-400', icon: 'mdi:account-star', iconBg: 'bg-violet-100 text-violet-600', countBg: 'bg-violet-200 text-violet-700' },
  { key: 'alumni', label: 'Alumni', borderColor: 'border-t-indigo-500', headerBg: 'bg-gradient-to-r from-indigo-50 to-indigo-100', accentBg: 'border-l-indigo-400', icon: 'mdi:school', iconBg: 'bg-indigo-100 text-indigo-600', countBg: 'bg-indigo-200 text-indigo-700' },
];

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function PipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [students, setStudents] = useState<StudentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movingStudent, setMovingStudent] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const stageFilter = searchParams.get('stage') || '';

  const fetchStudents = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      const res = await fetch(`/api/crm/lifecycle?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          router.push('/dashboard');
          return;
        }
        showToast('Failed to load pipeline data', 'error');
        return;
      }
      const data = await res.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Pipeline: Error fetching students', error);
      showToast('Failed to load pipeline data', 'error');
    } finally {
      setLoading(false);
    }
  }, [stageFilter, router, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchStudents(value);
    }, 300);
  };

  const moveStudent = async (studentId: string, studentName: string, newStage: string, newStageLabel: string) => {
    if (!window.confirm(`Move ${studentName} to ${newStageLabel}?`)) return;
    setMovingStudent(studentId);
    try {
      const res = await fetch('/api/crm/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, stage: newStage }),
      });

      if (res.ok) {
        setStudents(prev =>
          prev.map(s =>
            s.student_id === studentId
              ? { ...s, stage: newStage, stage_changed_at: new Date().toISOString() }
              : s
          )
        );
        showToast('Student moved successfully', 'success');
      } else {
        showToast('Failed to move student', 'error');
      }
    } catch (error) {
      console.error('Pipeline: Error moving student', error);
      showToast('Failed to move student', 'error');
    } finally {
      setMovingStudent(null);
    }
  };

  const getStudentsForStage = (stageKey: string) =>
    students.filter(s => s.stage === stageKey);

  if (loading) {
    return (
      <>
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-full mx-auto">
            <div className="h-7 w-48 bg-gray-200 rounded-none animate-pulse mb-4" />
            <div className="h-10 w-80 bg-gray-100 rounded-none animate-pulse" />
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-none border border-gray-100 overflow-hidden">
              <div className="h-14 bg-gray-50 animate-pulse" />
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-24 bg-gray-50 rounded-none animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-5 shadow-sm">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Pipeline</h1>
            <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-none">
              {students.length} students
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-none bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {STAGES.map(stage => {
          const stageStudents = getStudentsForStage(stage.key);
          return (
            <div key={stage.key} className={`bg-white rounded-none border-t-4 ${stage.borderColor} border border-gray-100 shadow-sm`}>
              {/* Stage Header */}
              <div className={`${stage.headerBg} px-5 py-4 rounded-none`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-none flex items-center justify-center ${stage.iconBg}`}>
                      <Icon icon={stage.icon} className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-900">{stage.label}</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${stage.countBg}`}>
                    {stageStudents.length} {stageStudents.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="p-4">
                {stageStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Icon icon="mdi:account-off-outline" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No students in this stage
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {stageStudents.map(student => (
                      <div
                        key={student.student_id}
                        className={`bg-white rounded-none p-3.5 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-2 ${stage.accentBg} ${
                          movingStudent === student.student_id ? 'opacity-50' : ''
                        }`}
                      >
                        <Link href={`/crm/students/${student.student_id}`} className="block">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="w-8 h-8 bg-gradient-to-br from-oecs-navy-blue to-blue-600 rounded-none flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {student.student_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {student.student_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
                          {student.risk_level ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RISK_COLORS[student.risk_level] || ''}`}>
                              {student.risk_level}
                            </span>
                          ) : <span />}

                          <select
                            className="text-xs bg-gray-50 border border-gray-200 rounded-none px-1.5 py-1 text-gray-600 cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={stage.key}
                            onChange={(e) => {
                              const targetStage = STAGES.find(s => s.key === e.target.value);
                              moveStudent(student.student_id, student.student_name, e.target.value, targetStage?.label || e.target.value);
                            }}
                            disabled={movingStudent === student.student_id}
                          >
                            {STAGES.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
