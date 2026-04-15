'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import { stripHtml } from '@/lib/utils';

interface ProgrammeDetails {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  difficulty?: string;
  estimated_duration?: string;
  passing_score: number;
  published: boolean;
  enrollment_count: number;
  is_enrolled: boolean;
  enrollment?: {
    status: string;
    enrolled_at: string;
    final_score?: number;
    completed_at?: string;
  };
  categories: Array<{ id: string; name: string; color: string; is_primary: boolean }>;
  courses: Array<{
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    difficulty?: string;
    order: number;
    weight: number;
    is_required: boolean;
  }>;
}

interface CourseProgress {
  course_id: string;
  is_completed: boolean;
  progress_percentage: number;
  grade?: number;
  effective_score: number;
}

interface ProgressSummary {
  total_courses: number;
  completed_courses: number;
  required_courses: number;
  completed_required: number;
  overall_progress: number;
  weighted_score?: number;
  is_complete: boolean;
  is_passing: boolean;
}

export default function ProgrammeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase, user } = useSupabase();
  const [programme, setProgramme] = useState<ProgrammeDetails | null>(null);
  const [progress, setProgress] = useState<{ courses: CourseProgress[]; summary: ProgressSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  const loadProgramme = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProgramme(data);

        // Load progress if enrolled
        if (data.is_enrolled) {
          const progressRes = await fetch(`/api/programmes/${id}/progress`, { headers });
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setProgress({ courses: progressData.courses, summary: progressData.summary });
          }
        }
      }
    } catch (error) {
      console.error('Error loading programme:', error);
    } finally {
      setLoading(false);
    }
  }, [id, getAuthHeaders]);

  useEffect(() => {
    loadProgramme();
  }, [loadProgramme]);

  const handleEnroll = async () => {
    if (!user) {
      window.location.href = '/auth/signin';
      return;
    }

    setEnrolling(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${id}/enroll`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        loadProgramme();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to enroll');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw from this programme?')) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/programmes/${id}/enroll`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        loadProgramme();
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
    }
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Beginner' };
      case 'intermediate': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Intermediate' };
      case 'advanced': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Advanced' };
      default: return null;
    }
  };

  const getCourseProgress = (courseId: string): CourseProgress | undefined => {
    return progress?.courses.find(c => c.course_id === courseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon icon="material-symbols:error" className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900">Programme not found</h2>
        </div>
      </div>
    );
  }

  const difficulty = getDifficultyBadge(programme.difficulty);
  const totalWeight = programme.courses.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 max-w-7xl py-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Programmes', href: '/programmes' },
              { label: programme.title }
            ]}
            className="mb-6 text-white/80"
          />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Programme Info */}
            <div className="flex-1">
              {/* Categories */}
              {programme.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {programme.categories.map(cat => (
                    <span
                      key={cat.id}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-2xl font-normal text-slate-900 tracking-tight mb-4">{programme.title}</h1>

              {programme.description && (
                <p className="text-xl text-white/80 mb-6">{programme.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-white/80">
                <span className="flex items-center gap-2">
                  <Icon icon="material-symbols:book" className="w-5 h-5" />
                  {programme.courses.length} courses
                </span>
                {programme.estimated_duration && (
                  <span className="flex items-center gap-2">
                    <Icon icon="material-symbols:schedule" className="w-5 h-5" />
                    {programme.estimated_duration}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Icon icon="material-symbols:people" className="w-5 h-5" />
                  {programme.enrollment_count} enrolled
                </span>
                {difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm ${difficulty.bg} ${difficulty.text}`}>
                    {difficulty.label}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Enrollment Card */}
            <div className="lg:w-80">
              <div className="bg-white rounded-lg shadow-lg p-6 text-gray-900">
                {programme.is_enrolled ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <Icon icon="material-symbols:check-circle" className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-green-700">Enrolled</h3>
                      <p className="text-sm text-gray-500">
                        Since {new Date(programme.enrollment?.enrolled_at || '').toLocaleDateString()}
                      </p>
                    </div>

                    {progress && (
                      <div className="space-y-4 mb-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{progress.summary.completed_courses}/{progress.summary.total_courses} courses</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 transition-all"
                              style={{ width: `${progress.summary.overall_progress}%` }}
                            />
                          </div>
                        </div>

                        {progress.summary.weighted_score !== null && (
                          <div className="text-center py-3 bg-gray-50 rounded-lg">
                            <div className="text-xl font-normal text-slate-900 tracking-tight">
                              {progress.summary.weighted_score?.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              Current Score (Pass: {programme.passing_score}%)
                            </div>
                          </div>
                        )}

                        {progress.summary.is_complete && progress.summary.is_passing && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                            <Icon icon="material-symbols:verified" className="w-6 h-6 text-green-600 mx-auto mb-1" />
                            <span className="text-sm font-medium text-green-700">Programme Completed!</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleWithdraw}
                      className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Withdraw from Programme
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-xl font-normal text-slate-900 tracking-tight mb-1">Free</div>
                      <p className="text-sm text-gray-500">
                        Passing score: {programme.passing_score}%
                      </p>
                    </div>

                    <Button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full"
                    >
                      {enrolling ? 'Enrolling...' : 'Enroll Now'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center mt-3">
                      Enrolling will also enroll you in all programme courses
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Programme Courses
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({programme.courses.length} courses)
          </span>
        </h2>

        <div className="space-y-4">
          {programme.courses.sort((a, b) => a.order - b.order).map((course, index) => {
            const courseProgress = getCourseProgress(course.id);
            const weightPercent = totalWeight > 0 ? Math.round((course.weight / totalWeight) * 100) : 0;

            return (
              <div
                key={course.id}
                className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                  courseProgress?.is_completed ? 'border-green-200' : ''
                }`}
              >
                <div className="flex items-stretch">
                  {/* Order number */}
                  <div className={`w-16 flex items-center justify-center text-2xl font-bold ${
                    courseProgress?.is_completed
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {courseProgress?.is_completed ? (
                      <Icon icon="material-symbols:check-circle" className="w-8 h-8" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-40 bg-gray-100 hidden md:block">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon icon="material-symbols:book" className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{stripHtml(course.description)}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded ${
                            course.is_required
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {course.is_required ? 'Required' : 'Optional'}
                          </span>
                          <span>Weight: {weightPercent}%</span>
                          {course.difficulty && (
                            <span className="capitalize">{course.difficulty}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {courseProgress && (
                          <div className="mb-2">
                            {courseProgress.grade !== null && courseProgress.grade !== undefined ? (
                              <div className="text-lg font-bold text-gray-900">
                                {courseProgress.grade.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-lg font-bold text-gray-400">
                                {courseProgress.progress_percentage}%
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {courseProgress.is_completed ? 'Completed' : 'In Progress'}
                            </div>
                          </div>
                        )}

                        <Link
                          href={`/course/${course.id}`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          {programme.is_enrolled ? 'Continue' : 'View'}
                          <Icon icon="material-symbols:arrow-forward" className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grade Calculation Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            <Icon icon="material-symbols:info" className="w-5 h-5 inline mr-2" />
            How Your Final Score is Calculated
          </h3>
          <p className="text-sm text-blue-800">
            Your final programme score is a weighted average of all course grades. Each course contributes
            based on its weight percentage shown above. You need a minimum score of <strong>{programme.passing_score}%</strong> and
            must complete all required courses to pass the programme.
          </p>
        </div>
      </div>
    </div>
  );
}
