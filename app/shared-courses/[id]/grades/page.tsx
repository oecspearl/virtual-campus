'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';

interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  student: { id: string; name: string; email: string; avatar: string | null } | null;
}

interface Assessment {
  id: string;
  title: string;
  max_score?: number | null;
}

interface SharedCourseDetail {
  share_id: string;
  course: { id: string; title: string };
  source_tenant: { id: string; name: string } | null;
  can_post_grades?: boolean;
  quizzes: Assessment[];
  assignments: Assessment[];
}

type AssessmentType = 'quiz' | 'assignment';

interface Grade {
  id: string;
  enrollment_id: string;
  student_id: string;
  assessment_type: string;
  assessment_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  graded_at: string | null;
  feedback: string | null;
  grader: { id: string; name: string } | null;
}

export default function SharedCourseGradebookPage() {
  const { id: shareId } = useParams<{ id: string }>();
  return (
    <RoleGuard
      roles={['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer']}
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-sm text-gray-600">Instructor access required.</p>
        </div>
      }
    >
      <Inner shareId={shareId} />
    </RoleGuard>
  );
}

function Inner({ shareId }: { shareId: string }) {
  const [course, setCourse] = useState<SharedCourseDetail | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [gradeDraft, setGradeDraft] = useState<
    Record<string, { score: string; maxScore: string; feedback: string }>
  >({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseRes, cohortRes, gradesRes] = await Promise.all([
        fetch(`/api/shared-courses/${shareId}`),
        fetch(`/api/shared-courses/${shareId}/cohort`),
        fetch(`/api/shared-courses/${shareId}/grades`),
      ]);
      if (!courseRes.ok) {
        const d = await courseRes.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load course');
      }
      const courseData: SharedCourseDetail = await courseRes.json();
      const cohortData = cohortRes.ok ? await cohortRes.json() : { enrollments: [] };
      const gradesData = gradesRes.ok ? await gradesRes.json() : { grades: [] };
      setCourse(courseData);
      setEnrollments(cohortData.enrollments || []);
      setGrades(gradesData.grades || []);
      if ((cohortData.enrollments || []).length > 0 && !selectedStudentId) {
        setSelectedStudentId(cohortData.enrollments[0].student?.id || '');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shareId, selectedStudentId]);

  useEffect(() => {
    load();
    // load is stable except when selectedStudentId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const assessments = useMemo(() => {
    if (!course) return [] as Array<Assessment & { type: AssessmentType }>;
    return [
      ...(course.quizzes || []).map((q) => ({ ...q, type: 'quiz' as const })),
      ...(course.assignments || []).map((a) => ({ ...a, type: 'assignment' as const })),
    ];
  }, [course]);

  const gradeByAssessment = useMemo(() => {
    const map = new Map<string, Grade>();
    for (const g of grades) {
      if (g.student_id !== selectedStudentId) continue;
      map.set(`${g.assessment_type}:${g.assessment_id}`, g);
    }
    return map;
  }, [grades, selectedStudentId]);

  const getDraft = (key: string, existing: Grade | undefined, maxDefault: number | null | undefined) => {
    const d = gradeDraft[key];
    if (d) return d;
    return {
      score: existing?.score?.toString() ?? '',
      maxScore: (existing?.max_score ?? maxDefault ?? '').toString(),
      feedback: existing?.feedback ?? '',
    };
  };

  const setDraft = (key: string, next: Partial<{ score: string; maxScore: string; feedback: string }>) => {
    setGradeDraft((prev) => {
      const existing = prev[key] || { score: '', maxScore: '', feedback: '' };
      return { ...prev, [key]: { ...existing, ...next } };
    });
  };

  const saveGrade = async (type: AssessmentType, assessmentId: string, maxDefault: number | null | undefined) => {
    if (!selectedStudentId) return;
    const key = `${type}:${assessmentId}`;
    const existing = gradeByAssessment.get(key);
    const draft = getDraft(key, existing, maxDefault);
    setSavingKey(key);
    try {
      const payload: any = {
        student_id: selectedStudentId,
        assessment_type: type,
        assessment_id: assessmentId,
        score: draft.score === '' ? null : Number(draft.score),
        max_score: draft.maxScore === '' ? null : Number(draft.maxScore),
        feedback: draft.feedback || null,
      };
      const res = await fetch(`/api/shared-courses/${shareId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save grade');
        return;
      }
      // Clear draft and refresh grades
      setGradeDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      const gradesRes = await fetch(`/api/shared-courses/${shareId}/grades`);
      if (gradesRes.ok) {
        const d = await gradesRes.json();
        setGrades(d.grades || []);
      }
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 space-y-4">
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-40 bg-white rounded-lg border border-gray-200 animate-pulse" />
          <div className="h-64 bg-white rounded-lg border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Course not found'}
          </div>
        </div>
      </div>
    );
  }

  if (!course.can_post_grades) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link href={`/shared-courses/${shareId}`} className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to course
          </Link>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            Grade posting is not enabled on this share. Ask the source institution to enable it.
          </div>
        </div>
      </div>
    );
  }

  const selectedStudent = enrollments.find((e) => e.student?.id === selectedStudentId)?.student || null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Link href={`/shared-courses/${shareId}`} className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
            <Icon icon="mdi:arrow-left" className="w-4 h-4" />
            Back to course
          </Link>
          <h1 className="text-xl font-display text-gray-900 mt-2">Gradebook — {course.course.title}</h1>
          <p className="text-sm text-gray-500">
            Grade your institution&apos;s students on the shared assessments from {course.source_tenant?.name || 'the source institution'}.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Student ({enrollments.length})
          </label>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No students enrolled yet.</p>
          ) : (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              {enrollments.map((e) =>
                e.student ? (
                  <option key={e.id} value={e.student.id}>
                    {e.student.name} ({e.student.email}) — {e.progress_percentage}% complete
                  </option>
                ) : null
              )}
            </select>
          )}
        </div>

        {selectedStudent && assessments.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
            This course has no quizzes or assignments yet.
          </div>
        )}

        {selectedStudent &&
          assessments.map((a) => {
            const key = `${a.type}:${a.id}`;
            const existing = gradeByAssessment.get(key);
            const draft = getDraft(key, existing, a.max_score);
            const isSaving = savingKey === key;
            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-100 text-gray-600 mb-1">
                      {a.type}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    {existing?.graded_at && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Last graded {new Date(existing.graded_at).toLocaleString()}
                        {existing.grader ? ` by ${existing.grader.name}` : ''}
                      </p>
                    )}
                  </div>
                  {existing && existing.percentage !== null && (
                    <span className="text-sm font-semibold text-emerald-700">
                      {Number(existing.percentage).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Score</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft.score}
                      onChange={(e) => setDraft(key, { score: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max score</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft.maxScore}
                      onChange={(e) => setDraft(key, { maxScore: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => saveGrade(a.type, a.id, a.max_score)}
                      className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : existing ? 'Update' : 'Post grade'}
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                  <textarea
                    rows={2}
                    value={draft.feedback}
                    onChange={(e) => setDraft(key, { feedback: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md"
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
