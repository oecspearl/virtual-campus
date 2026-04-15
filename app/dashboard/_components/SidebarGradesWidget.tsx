'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface GradeItem {
  id: string;
  score: number;
  max_score: number;
  graded_at: string;
  grade_item?: {
    title: string;
    type: string;
  };
  course?: {
    title: string;
  };
}

function getGradeColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600 bg-green-50';
  if (percentage >= 80) return 'text-blue-600 bg-blue-50';
  if (percentage >= 70) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SidebarGradesWidget() {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/grades')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          // Flatten all grades from all courses, take the 5 most recent
          const allGrades: GradeItem[] = [];
          const courses = data.courses || data || [];
          if (Array.isArray(courses)) {
            for (const course of courses) {
              const items = course.grades || course.items || [];
              for (const g of items) {
                allGrades.push({
                  ...g,
                  course: { title: course.course_title || course.title || 'Course' },
                });
              }
            }
          }
          allGrades.sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime());
          setGrades(allGrades.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon="mdi:chart-line" className="w-4 h-4 text-purple-500" />
          Recent Grades
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : grades.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No grades yet
          </div>
        ) : (
          grades.map(grade => {
            const pct = grade.max_score > 0 ? Math.round((grade.score / grade.max_score) * 100) : 0;
            const colorClass = getGradeColor(pct);
            return (
              <div key={grade.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-tight line-clamp-1">
                      {grade.grade_item?.title || 'Grade'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{grade.course?.title}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{timeAgo(grade.graded_at)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {grades.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <Link href="/my-courses" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View All Grades →
          </Link>
        </div>
      )}
    </div>
  );
}
