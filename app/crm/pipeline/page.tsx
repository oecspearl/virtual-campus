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
  { key: 'prospect', label: 'Prospect', borderColor: 'border-t-slate-400', headerBg: 'bg-gradient-to-b from-slate-50 to-white', icon: 'mdi:account-question', iconBg: 'bg-slate-100 text-slate-600', countBg: 'bg-slate-200 text-slate-700', dropBg: 'bg-slate-50' },
  { key: 'onboarding', label: 'Onboarding', borderColor: 'border-t-blue-500', headerBg: 'bg-gradient-to-b from-blue-50 to-white', icon: 'mdi:account-clock', iconBg: 'bg-blue-100 text-blue-600', countBg: 'bg-blue-200 text-blue-700', dropBg: 'bg-blue-50' },
  { key: 'active', label: 'Active', borderColor: 'border-t-emerald-500', headerBg: 'bg-gradient-to-b from-emerald-50 to-white', icon: 'mdi:account-check', iconBg: 'bg-emerald-100 text-emerald-600', countBg: 'bg-emerald-200 text-emerald-700', dropBg: 'bg-emerald-50' },
  { key: 'at_risk', label: 'At Risk', borderColor: 'border-t-red-500', headerBg: 'bg-gradient-to-b from-red-50 to-white', icon: 'mdi:account-alert', iconBg: 'bg-red-100 text-red-600', countBg: 'bg-red-200 text-red-700', dropBg: 'bg-red-50' },
  { key: 're_engagement', label: 'Re-Engage', borderColor: 'border-t-amber-500', headerBg: 'bg-gradient-to-b from-amber-50 to-white', icon: 'mdi:account-reactivate', iconBg: 'bg-amber-100 text-amber-600', countBg: 'bg-amber-200 text-amber-700', dropBg: 'bg-amber-50' },
  { key: 'completing', label: 'Completing', borderColor: 'border-t-violet-500', headerBg: 'bg-gradient-to-b from-violet-50 to-white', icon: 'mdi:account-star', iconBg: 'bg-violet-100 text-violet-600', countBg: 'bg-violet-200 text-violet-700', dropBg: 'bg-violet-50' },
  { key: 'alumni', label: 'Alumni', borderColor: 'border-t-indigo-500', headerBg: 'bg-gradient-to-b from-indigo-50 to-white', icon: 'mdi:school', iconBg: 'bg-indigo-100 text-indigo-600', countBg: 'bg-indigo-200 text-indigo-700', dropBg: 'bg-indigo-50' },
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
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggedStudent, setDraggedStudent] = useState<StudentCard | null>(null);
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

  const moveStudent = async (studentId: string, studentName: string, newStage: string) => {
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
        showToast(`Moved ${studentName} to ${STAGES.find(s => s.key === newStage)?.label || newStage}`, 'success');
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

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, student: StudentCard) => {
    setDraggedStudent(student);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', student.student_id);
    // Make the dragged element semi-transparent
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedStudent(null);
    setDragOverStage(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: string) => {
    // Only clear if we're actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && e.currentTarget instanceof HTMLElement && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedStudent || draggedStudent.stage === stageKey) return;
    moveStudent(draggedStudent.student_id, draggedStudent.student_name, stageKey);
    setDraggedStudent(null);
  };

  const getStudentsForStage = (stageKey: string) =>
    students.filter(s => s.stage === stageKey);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="h-10 w-full max-w-md bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="h-14 bg-gray-50 animate-pulse" />
              <div className="p-3 space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-20 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Pipeline</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
            {students.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="relative max-w-md">
          <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 min-w-max pb-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
          {STAGES.map(stage => {
            const stageStudents = getStudentsForStage(stage.key);
            const isDropTarget = dragOverStage === stage.key && draggedStudent?.stage !== stage.key;
            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-64 flex flex-col rounded-lg border-t-4 ${stage.borderColor} border border-gray-100 bg-white shadow-sm transition-all duration-200 ${
                  isDropTarget ? 'ring-2 ring-blue-400 ring-offset-1 shadow-md' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={(e) => handleDragLeave(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Column Header */}
                <div className={`${stage.headerBg} px-4 py-3 flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stage.iconBg}`}>
                        <Icon icon={stage.icon} className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-gray-900">{stage.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stage.countBg}`}>
                      {stageStudents.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors duration-200 ${
                  isDropTarget ? stage.dropBg : ''
                }`} style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {stageStudents.length === 0 ? (
                    <div className={`text-center py-8 text-gray-400 text-xs transition-colors duration-200 ${
                      isDropTarget ? 'text-blue-500' : ''
                    }`}>
                      <Icon
                        icon={isDropTarget ? 'mdi:arrow-down-circle' : 'mdi:account-off-outline'}
                        className={`w-6 h-6 mx-auto mb-1 ${isDropTarget ? 'text-blue-400 animate-bounce' : 'text-gray-300'}`}
                      />
                      {isDropTarget ? 'Drop here' : 'No students'}
                    </div>
                  ) : (
                    stageStudents.map(student => (
                      <div
                        key={student.student_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, student)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                          movingStudent === student.student_id ? 'opacity-50 pointer-events-none' : ''
                        } ${
                          draggedStudent?.student_id === student.student_id ? 'opacity-40' : ''
                        }`}
                      >
                        <Link href={`/crm/students/${student.student_id}`} className="block" draggable={false}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-700 to-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {student.student_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">
                                {student.student_name}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </Link>

                        {student.risk_level && (
                          <div className="mt-2 pt-2 border-t border-gray-50">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${RISK_COLORS[student.risk_level] || ''}`}>
                              {student.risk_level} risk
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Drop indicator when dragging over non-empty column */}
                  {isDropTarget && stageStudents.length > 0 && (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 text-center">
                      <Icon icon="mdi:arrow-down-circle" className="w-5 h-5 text-blue-400 mx-auto animate-bounce" />
                      <span className="text-xs text-blue-500 font-medium">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
