'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CourseTabBar from '@/app/components/course/CourseTabBar';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import RoleGuard from '@/app/components/RoleGuard';

interface GradeItem {
  id: string;
  name: string;
  category: string;
  max_points: number;
  weight?: number;
}

interface StudentGrade {
  grade_item_id: string;
  score: number | null;
  grade_item?: GradeItem;
}

export default function CourseGradesPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, profileRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
          fetch('/api/auth/profile', { cache: 'no-store' }),
        ]);

        if (courseRes.ok) setCourse(await courseRes.json());

        let pData = null;
        if (profileRes.ok) {
          pData = await profileRes.json();
          setProfile(pData);
        }

        // Fetch grade items for the course
        const gradeItemsRes = await fetch(`/api/courses/${courseId}/gradebook/items`, { cache: 'no-store' });
        if (gradeItemsRes.ok) {
          const giData = await gradeItemsRes.json();
          setGradeItems(giData.gradeItems || giData.grade_items || giData.items || []);
        }

        // Fetch student's own grades
        if (pData?.id) {
          const gradesRes = await fetch(`/api/courses/${courseId}/gradebook/grades?student_id=${pData.id}`, { cache: 'no-store' });
          if (gradesRes.ok) {
            const gData = await gradesRes.json();
            setStudentGrades(gData.grades || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch grades:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const isStaff = profile?.role && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role);

  const getScore = (gradeItemId: string) => {
    const grade = studentGrades.find(g => g.grade_item_id === gradeItemId);
    return grade?.score;
  };

  const totalEarned = gradeItems.reduce((sum, gi) => {
    const score = getScore(gi.id);
    return sum + (score ?? 0);
  }, 0);
  const totalPossible = gradeItems.reduce((sum, gi) => sum + gi.max_points, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CourseTabBar courseId={courseId} />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: 'Grades' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">Grades</h1>
          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
            <div className="flex items-center gap-2">
              <Link
                href={`/courses/${courseId}/gradebook`}
                className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                Full Gradebook
              </Link>
              <Link
                href={`/courses/${courseId}/gradebook/setup`}
                className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                Setup
              </Link>
            </div>
          </RoleGuard>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200/80 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : gradeItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-12 text-center">
            <p className="text-sm text-slate-400">No grade items configured for this course yet.</p>
            <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
              <Link
                href={`/courses/${courseId}/gradebook/setup`}
                className="inline-block mt-3 px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                Setup Gradebook
              </Link>
            </RoleGuard>
          </div>
        ) : (
          <>
            {/* Summary */}
            {!isStaff && (
              <div className="bg-white rounded-lg border border-gray-200/80 px-5 py-4 mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">Overall Grade</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{totalEarned} / {totalPossible}</span>
                  <span className="text-lg font-medium text-slate-800 tabular-nums">{overallPct}%</span>
                </div>
              </div>
            )}

            {/* Grade Items */}
            <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-2.5 border-b border-gray-100 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                <div className="col-span-5">Item</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2 text-right">Points</div>
                <div className="col-span-3 text-right">Score</div>
              </div>
              {gradeItems.map((item) => {
                const score = getScore(item.id);
                const pct = score != null ? Math.round((score / item.max_points) * 100) : null;
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <div className="col-span-5 text-sm text-slate-700 truncate">{item.name}</div>
                    <div className="col-span-2 text-xs text-slate-400 capitalize">{item.category || '—'}</div>
                    <div className="col-span-2 text-sm text-slate-400 text-right tabular-nums">{item.max_points}</div>
                    <div className="col-span-3 text-right">
                      {score != null ? (
                        <span className="text-sm text-slate-700 tabular-nums">
                          {score} <span className="text-slate-300">/ {item.max_points}</span>
                          <span className="ml-2 text-xs text-slate-400">{pct}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
