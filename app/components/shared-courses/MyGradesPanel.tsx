'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface Grade {
  id: string;
  assessment_type: 'quiz' | 'assignment' | 'discussion' | 'survey' | string;
  assessment_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  graded_at: string | null;
  feedback: string | null;
  grader: { id: string; name: string } | null;
}

interface AssessmentLookupEntry {
  id: string;
  title: string;
  type: 'quiz' | 'assignment';
}

interface Props {
  shareId: string;
  assessments: AssessmentLookupEntry[];
}

export default function MyGradesPanel({ shareId, assessments }: Props) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/grades`);
      const data = await res.json();
      if (res.ok) setGrades(data.grades || []);
    } catch (e) {
      console.error('Grades load error:', e);
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 h-20 animate-pulse" />
    );
  }

  if (grades.length === 0) return null;

  const titleFor = (g: Grade) => {
    const match = assessments.find((a) => a.id === g.assessment_id && a.type === g.assessment_type);
    return match?.title || `${g.assessment_type} ${g.assessment_id.slice(0, 6)}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Icon icon="mdi:chart-line" className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900">My grades</h3>
        <span className="text-[11px] text-gray-500">({grades.length})</span>
      </div>
      <div className="divide-y divide-gray-100">
        {grades.map((g) => (
          <div key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-100 text-gray-600 mr-1.5">
                  {g.assessment_type}
                </span>
                <span className="text-sm font-medium text-gray-900 break-words">{titleFor(g)}</span>
              </div>
              {g.percentage !== null && (
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    g.percentage >= 70 ? 'text-emerald-700' : g.percentage >= 50 ? 'text-amber-700' : 'text-red-700'
                  }`}
                >
                  {Number(g.percentage).toFixed(1)}%
                </span>
              )}
            </div>
            {g.score !== null && g.max_score !== null && (
              <p className="text-xs text-gray-600">
                {Number(g.score).toFixed(2)} / {Number(g.max_score).toFixed(2)}
              </p>
            )}
            {g.feedback && (
              <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-2 whitespace-pre-wrap">
                {g.feedback}
              </p>
            )}
            {g.graded_at && (
              <p className="text-[10px] text-gray-400 mt-1">
                Posted {new Date(g.graded_at).toLocaleDateString()}
                {g.grader ? ` by ${g.grader.name}` : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
