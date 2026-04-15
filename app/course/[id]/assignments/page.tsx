'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CourseTabBar from '@/app/components/course/CourseTabBar';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import RoleGuard from '@/app/components/RoleGuard';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  points?: number;
  due_date?: string;
  type: 'quiz' | 'assignment';
  time_limit?: number;
  passing_score?: number;
  is_published?: boolean;
}

export default function CourseAssignmentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [quizzes, setQuizzes] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assessment[]>([]);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, quizzesRes, assignmentsRes, profileRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
          fetch(`/api/quizzes?course_id=${courseId}`, { cache: 'no-store' }),
          fetch(`/api/assignments?course_id=${courseId}`, { cache: 'no-store' }),
          fetch('/api/auth/profile', { cache: 'no-store' }),
        ]);

        if (courseRes.ok) setCourse(await courseRes.json());
        if (quizzesRes.ok) {
          const qData = await quizzesRes.json();
          setQuizzes((qData.quizzes || []).filter((q: Assessment) => q.is_published !== false));
        }
        if (assignmentsRes.ok) {
          const aData = await assignmentsRes.json();
          setAssignments(aData.assignments || []);
        }
        if (profileRes.ok) setProfile(await profileRes.json());
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const isStaff = profile?.role && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role);
  const visibleAssignments = assignments.filter(a => isStaff || a.is_published !== false);
  const allItems = [
    ...quizzes.map(q => ({ ...q, type: 'quiz' as const })),
    ...visibleAssignments.map(a => ({ ...a, type: 'assignment' as const })),
  ].sort((a, b) => {
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CourseTabBar courseId={courseId} />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: 'Assignments' },
          ]}
          className="mb-6"
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight">Assignments & Quizzes</h1>
          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
            <div className="flex items-center gap-2">
              <Link
                href={`/assignments/create?course_id=${courseId}`}
                className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                New Assignment
              </Link>
              <Link
                href={`/quizzes/create?course_id=${courseId}`}
                className="px-3 py-1.5 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                New Quiz
              </Link>
            </div>
          </RoleGuard>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200/80 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200/80 p-12 text-center">
            <p className="text-sm text-slate-400">No assignments or quizzes in this course yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === 'quiz' ? `/quiz/${item.id}/attempt` : `/assignment/${item.id}`}
                className="block bg-white rounded-lg border border-gray-200/80 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                      </span>
                      {item.is_published === false && (
                        <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">Draft</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      {item.points && <span>{item.points} pts</span>}
                      {item.due_date && (
                        <>
                          <span className="text-slate-200">|</span>
                          <span>Due {new Date(item.due_date).toLocaleDateString()}</span>
                        </>
                      )}
                      {item.type === 'quiz' && item.time_limit && (
                        <>
                          <span className="text-slate-200">|</span>
                          <span>{item.time_limit} min</span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
