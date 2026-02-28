'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import ProgressBar from '@/app/components/ProgressBar';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';
import VideoConferenceSection from '@/app/components/VideoConferenceSection';
import CourseInstructorManager from '@/app/components/CourseInstructorManager';
import CourseGroupsManager from '@/app/components/CourseGroupsManager';
import DraggableLessonList from '@/app/components/DraggableLessonList';
import ResourceLinksSidebar from '@/app/components/ResourceLinksSidebar';
import Breadcrumb from '@/app/components/Breadcrumb';
import ProgressVisualization from '@/app/components/ProgressVisualization';
import { logCourseAccess } from '@/lib/activity-tracker';
import CourseBackupButton from '@/app/components/CourseBackupButton';
import CourseRestoreButton from '@/app/components/CourseRestoreButton';
import SessionRecordingsCard from '@/app/components/SessionRecordingsCard';
import { stripHtml } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

// Helper functions for modality display
const formatModality = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return 'Self-paced';
    case 'blended': return 'Blended';
    case 'instructor_led': return 'Instructor-led';
    default: return 'Self-paced';
  }
};

const getModalityIcon = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return '📖';
    case 'blended': return '🔄';
    case 'instructor_led': return '👨‍🏫';
    default: return '📖';
  }
};

export default function CourseDetailPage() {
  const { supabase } = useSupabase();
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [course, setCourse] = React.useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lessons, setLessons] = React.useState<Array<any>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = React.useState<any>(null);
  const [progress, setProgress] = React.useState<{total:number;completed:number;percentage:number}|null>(null);
  const [enrolling, setEnrolling] = React.useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = React.useState<'not_enrolled' | 'enrolled' | 'checking'>('checking');
  const [isReorderMode, setIsReorderMode] = React.useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = React.useState(false); // Default collapsed
  const [isGroupsOpen, setIsGroupsOpen] = React.useState(false); // Default collapsed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseSurveys, setCourseSurveys] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseQuizzes, setCourseQuizzes] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseAssignments, setCourseAssignments] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gradedDiscussions, setGradedDiscussions] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        const [cRes, lRes, profRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
          fetch(`/api/lessons?course_id=${courseId}`, { cache: 'no-store' }),
          session ? fetch('/api/auth/profile', { 
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }) : Promise.resolve({ ok: false })
        ]);
        const cData = await cRes.json();
        const lData = await lRes.json();
        const pData = profRes.ok && 'json' in profRes ? await (profRes as Response).json() : null;
        setCourse(cData);
        // Ensure lessons are sorted by order field
        const lessonsArray = Array.isArray(lData.lessons) ? lData.lessons : [];
        lessonsArray.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setLessons(lessonsArray);
        setProfile(pData);
        
        // Log course access activity
        if (courseId && cData?.id) {
          logCourseAccess(courseId).catch(err => {
            console.error('Failed to log course access:', err);
          });
        }
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    })();
  }, [courseId, supabase]);

  // Fetch course surveys
  React.useEffect(() => {
    (async () => {
      if (!courseId) return;
      try {
        const res = await fetch(`/api/surveys?course_id=${courseId}&published=true`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setCourseSurveys(data.surveys || []);
        }
      } catch (error) {
        console.error('Error loading course surveys:', error);
      }
    })();
  }, [courseId]);

  // Fetch course quizzes and assignments
  React.useEffect(() => {
    (async () => {
      if (!courseId) return;
      try {
        const [quizzesRes, assignmentsRes, discussionsRes] = await Promise.all([
          fetch(`/api/quizzes?course_id=${courseId}`, { cache: 'no-store' }),
          fetch(`/api/assignments?course_id=${courseId}`, { cache: 'no-store' }),
          fetch(`/api/courses/${courseId}/discussions`, { cache: 'no-store' })
        ]);

        if (quizzesRes.ok) {
          const data = await quizzesRes.json();
          setCourseQuizzes((data.quizzes || []).filter((q: any) => q.published));
        }
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setCourseAssignments(data.assignments || []);
        }
        if (discussionsRes.ok) {
          const data = await discussionsRes.json();
          // Filter to only include graded discussions
          setGradedDiscussions((data.discussions || []).filter((d: any) => d.is_graded));
        }
      } catch (error) {
        console.error('Error loading course assessments:', error);
      }
    })();
  }, [courseId]);

  React.useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) return;

        const res = await fetch(`/api/progress/${profile.id}/course/${courseId}`, { 
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) setProgress(await res.json());
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    })();
  }, [profile, courseId, supabase]);

  // Check enrollment status
  React.useEffect(() => {
    (async () => {
      if (!profile?.id) {
        setEnrollmentStatus('not_enrolled');
        return;
      }

      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setEnrollmentStatus('not_enrolled');
          return;
        }

        const res = await fetch('/api/enrollments?me=1', {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
          const isEnrolled = enrollments.some((e: any) => e.course_id === courseId && e.status === 'active');
          setEnrollmentStatus(isEnrolled ? 'enrolled' : 'not_enrolled');
        } else {
          setEnrollmentStatus('not_enrolled');
        }
      } catch (error) {
        console.error('Error checking enrollment status:', error);
        setEnrollmentStatus('not_enrolled');
      }
    })();
  }, [profile, courseId, supabase]);

  const enroll = async () => {
    setEnrolling(true);
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('You must be logged in to enroll in courses.');
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/enroll`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Successfully enrolled in course!');
        setEnrollmentStatus('enrolled');
        // Refresh the page to show updated enrollment status
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonReorder = (reorderedLessons: any[]) => {
    setLessons(reorderedLessons);
  };

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
  };

  if (!course) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading course...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-800/90"></div>
        <div className="relative mx-auto max-w-8xl px-4 py-8 sm:py-12 lg:py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
            <div className="flex-1 order-2 lg:order-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base">{getModalityIcon(course.modality)}</span>
                  <span className="text-xs sm:text-sm font-medium text-blue-100">{formatModality(course.modality)}</span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-blue-300"></div>
                <span className="text-xs sm:text-sm text-blue-200 capitalize">{course.difficulty || 'All Levels'}</span>
                {course.estimated_duration && (
                  <>
                    <div className="w-px h-3 sm:h-4 bg-blue-300"></div>
                    <span className="text-xs sm:text-sm text-blue-200">{course.estimated_duration}</span>
                  </>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                {course.title}
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed max-w-3xl">
                {stripHtml(course.description || '')}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">{lessons.length} Lessons</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">{course.estimated_duration || 'Flexible'}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium">Certificate Included</span>
                </div>
              </div>
            </div>

            {/* Course Thumbnail */}
            <div className="w-full sm:w-80 lg:w-80 lg:flex-shrink-0 order-1 lg:order-2">
              {course.thumbnail ? (
                <div className="relative">
                  <img 
                    src={course.thumbnail} 
                    alt="Course thumbnail" 
                    className="w-full h-48 sm:h-64 lg:h-80 rounded-xl sm:rounded-2xl object-cover shadow-2xl ring-2 sm:ring-4 ring-white/20" 
                  />
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              ) : (
                <div 
                  className="w-full h-48 sm:h-64 lg:h-80 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{
                    background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))`
                  }}
                >
                  <div className="text-center text-white">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-xs sm:text-sm font-medium">Course Preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-8xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course' },
          ]}
          className="mb-6"
        />

        {/* Progress Visualization */}
        {progress && (
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <ProgressVisualization
              total={progress.total}
              completed={progress.completed}
              percentage={progress.percentage}
              label="Course Progress"
              size="lg"
              variant="list"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Course Overview */}
            {course.syllabus && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Overview</h2>
                      <p className="text-sm sm:text-base text-gray-600">What you'll learn in this course</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8 rich-text-content-wrapper">
                  <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.syllabus) }} />
                </div>
              </div>
            )}

            {/* Course Statistics */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Statistics</h2>
                    <p className="text-xs sm:text-sm text-gray-600">Key metrics and insights</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div className="text-center p-3 sm:p-4 bg-purple-50 sm:bg-transparent rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">{lessons.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Lessons</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-50 sm:bg-transparent rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{course.estimated_duration || 'Flexible'}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Duration</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-50 sm:bg-transparent rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1 sm:mb-2 capitalize">{course.difficulty || 'All Levels'}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Difficulty</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-50 sm:bg-transparent rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-teal-600 mb-1 sm:mb-2">{formatModality(course.modality)}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Modality</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Conferences Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Live Sessions</h2>
                    <p className="text-sm sm:text-base text-gray-600">Join interactive video conferences</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <VideoConferenceSection
                  courseId={courseId}
                  isInstructor={profile?.role === 'instructor' || profile?.role === 'curriculum_designer' || profile?.role === 'admin' || profile?.role === 'super_admin'}
                />
              </div>
            </div>

            {/* Lessons Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Curriculum</h2>
                      <p className="text-sm sm:text-base text-gray-600">Structured learning path with {lessons.length} lessons</p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">{lessons.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Lessons</div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <DraggableLessonList
                  lessons={lessons}
                  courseId={courseId}
                  onReorder={handleLessonReorder}
                  isReorderMode={isReorderMode}
                  onToggleReorderMode={toggleReorderMode}
                />
              </div>
            </div>

            {/* Course Assessments Section */}
            {(courseQuizzes.length > 0 || courseAssignments.length > 0 || gradedDiscussions.length > 0) && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon icon="material-symbols:assignment" className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Assessments</h2>
                        <p className="text-xs sm:text-sm text-gray-600">Quizzes, assignments, and graded discussions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/quizzes/create?course_id=${courseId}`}
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Icon icon="material-symbols:add" className="w-4 h-4" />
                            Quiz
                          </Link>
                          <Link
                            href={`/assignments/create?course_id=${courseId}`}
                            className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                          >
                            <Icon icon="material-symbols:add" className="w-4 h-4" />
                            Assignment
                          </Link>
                        </div>
                      </RoleGuard>
                      <div className="text-center sm:text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-amber-600">{courseQuizzes.length + courseAssignments.length + gradedDiscussions.length}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Total</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="space-y-3">
                    {/* Quizzes */}
                    {courseQuizzes.map((quiz: any) => (
                      <div
                        key={quiz.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon icon="material-symbols:quiz" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Quiz</span>
                            <div className="font-semibold text-sm sm:text-base text-gray-900">{quiz.title}</div>
                          </div>
                          {quiz.description && (
                            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{quiz.description}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {quiz.time_limit && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:timer" className="w-3 h-3" />
                                {quiz.time_limit} min
                              </span>
                            )}
                            {quiz.passing_score && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:target" className="w-3 h-3" />
                                Pass: {quiz.passing_score}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/quiz/${quiz.id}/attempt`}
                            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Take Quiz
                          </Link>
                          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                            <Link
                              href={`/grade/quiz/${quiz.id}`}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                            >
                              Results
                            </Link>
                          </RoleGuard>
                        </div>
                      </div>
                    ))}

                    {/* Assignments */}
                    {courseAssignments
                      .filter((a: any) => a.published || ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile?.role))
                      .map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon icon="material-symbols:edit-document" className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">Assignment</span>
                            {!assignment.published && (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Draft</span>
                            )}
                            <div className="font-semibold text-sm sm:text-base text-gray-900">{assignment.title}</div>
                          </div>
                          {assignment.description && (
                            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{stripHtml(assignment.description)}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {assignment.due_date && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {assignment.points && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:star" className="w-3 h-3" />
                                {assignment.points} points
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/assignment/${assignment.id}`}
                            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            View
                          </Link>
                          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                            <Link
                              href={`/grade/assignment/${assignment.id}`}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                            >
                              Grade
                            </Link>
                          </RoleGuard>
                        </div>
                      </div>
                    ))}

                    {/* Graded Discussions */}
                    {gradedDiscussions.map((discussion: any) => (
                      <div
                        key={discussion.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg sm:rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon icon="material-symbols:forum" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Discussion</span>
                            <div className="font-semibold text-sm sm:text-base text-gray-900">{discussion.title}</div>
                          </div>
                          {discussion.content && (
                            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{discussion.content.replace(/<[^>]*>/g, '').substring(0, 100)}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {discussion.points && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:star" className="w-3 h-3" />
                                {discussion.points} points
                              </span>
                            )}
                            {discussion.due_date && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:calendar-today" className="w-3 h-3" />
                                Due: {new Date(discussion.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {discussion.min_replies && discussion.min_replies > 0 && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:reply" className="w-3 h-3" />
                                Min {discussion.min_replies} replies
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/course/${courseId}/discussions/${discussion.id}`}
                            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                          >
                            Participate
                          </Link>
                          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                            <Link
                              href={`/course/${courseId}/discussions/${discussion.id}?grade=true`}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                            >
                              Grade
                            </Link>
                          </RoleGuard>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add Assessment button for instructors when no assessments exist */}
            {courseQuizzes.length === 0 && courseAssignments.length === 0 && gradedDiscussions.length === 0 && (
              <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon icon="material-symbols:assignment" className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Assessments</h2>
                        <p className="text-xs sm:text-sm text-gray-600">Add quizzes and assignments</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="text-center py-6">
                      <Icon icon="material-symbols:assignment" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-4">No course assessments yet</p>
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/quizzes/create?course_id=${courseId}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Icon icon="material-symbols:quiz" className="w-5 h-5" />
                          Create Quiz
                        </Link>
                        <Link
                          href={`/assignments/create?course_id=${courseId}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Icon icon="material-symbols:edit-document" className="w-5 h-5" />
                          Create Assignment
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </RoleGuard>
            )}

            {/* Course Evaluations Section */}
            {courseSurveys.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon icon="material-symbols:poll" className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Evaluations</h2>
                        <p className="text-xs sm:text-sm text-gray-600">Share your feedback about this course</p>
                      </div>
                    </div>
                    <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                      <Link
                        href={`/surveys/create?course_id=${courseId}`}
                        className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                      >
                        <Icon icon="material-symbols:add" className="w-4 h-4" />
                        Add Survey
                      </Link>
                    </RoleGuard>
                  </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="space-y-3">
                    {courseSurveys.map((survey: any) => (
                      <div
                        key={survey.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg sm:rounded-xl border border-teal-200 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon icon="material-symbols:poll" className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base text-gray-900">{survey.title}</div>
                          {survey.description && (
                            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{survey.description}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {survey.is_anonymous && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:visibility-off" className="w-3 h-3" />
                                Anonymous
                              </span>
                            )}
                            {survey.response_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <Icon icon="material-symbols:group" className="w-3 h-3" />
                                {survey.response_count} responses
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {survey.has_responded && !survey.can_respond ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg">
                              Completed
                            </span>
                          ) : (
                            <Link
                              href={`/surveys/${survey.id}/take`}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                            >
                              Take Survey
                            </Link>
                          )}
                          <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                            <Link
                              href={`/surveys/${survey.id}/results`}
                              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                            >
                              Results
                            </Link>
                          </RoleGuard>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add Survey button for instructors when no surveys exist */}
            {courseSurveys.length === 0 && (
              <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon icon="material-symbols:poll" className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Evaluations</h2>
                        <p className="text-xs sm:text-sm text-gray-600">Collect feedback from students</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="text-center py-6">
                      <Icon icon="material-symbols:poll" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-4">No course evaluations yet</p>
                      <Link
                        href={`/surveys/create?course_id=${courseId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <Icon icon="material-symbols:add" className="w-5 h-5" />
                        Create Course Evaluation
                      </Link>
                    </div>
                  </div>
                </div>
              </RoleGuard>
            )}

            {/* Course Team Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Course Team</h2>
                    <p className="text-xs sm:text-sm text-gray-600">Meet your instructors and facilitators</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <CourseInstructorManager
                  courseId={courseId}
                  isAdmin={profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'curriculum_designer'}
                />
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Enrollment Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Get Started</h3>
                <p className="text-blue-100 text-xs sm:text-sm">Join this course today</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Modality</span>
                    <span className="font-medium text-gray-900">{getModalityIcon(course.modality)} {formatModality(course.modality)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Difficulty</span>
                    <span className="font-medium text-gray-900 capitalize">{course.difficulty || 'All Levels'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium text-gray-900">{course.estimated_duration || 'Flexible'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Lessons</span>
                    <span className="font-medium text-gray-900">{lessons.length}</span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6">
                  {enrollmentStatus === 'checking' ? (
                    <div className="w-full bg-gray-100 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs sm:text-sm text-gray-600">Checking...</span>
                      </div>
                    </div>
                  ) : enrollmentStatus === 'enrolled' ? (
                    <div className="text-center space-y-2 sm:space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enrolled
                      </div>
                      <Link 
                        href="/my-courses" 
                        className="block text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View in My Courses →
                      </Link>
                    </div>
                  ) : (
                    <button 
                      onClick={enroll} 
                      disabled={enrolling || !profile}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none text-sm sm:text-base"
                    >
                      {enrolling ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs sm:text-sm">Enrolling...</span>
                        </div>
                      ) : !profile ? (
                        'Login to Enroll'
                      ) : (
                        'Enroll Now'
                      )}
                    </button>
                  )}
                  {profile && (
                    <div className="mt-3 text-center">
                      <Link
                        href={`/courses/${courseId}/participants`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View Participants
                      </Link>
                    </div>
                  )}
                </div>

                {progress && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Your Progress</span>
                      <span className="text-xs sm:text-sm text-gray-600">{progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{progress.completed} of {progress.total} lessons completed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="w-full bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between hover:from-gray-100 hover:to-gray-150 transition-colors"
              >
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isQuickActionsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isQuickActionsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                <Link 
                  href={`/course/${courseId}/announcements`} 
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-orange-50 transition-colors group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">Announcements</div>
                    <div className="text-xs sm:text-sm text-gray-600">Course updates</div>
                  </div>
                </Link>

                <Link 
                  href={`/course/${courseId}/discussions`} 
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">Discussions</div>
                    <div className="text-xs sm:text-sm text-gray-600">Join the conversation</div>
                  </div>
                </Link>

                {/* View Participants: available to all enrolled users */}
                {enrollmentStatus === 'enrolled' && (
                  <Link 
                    href={`/courses/${courseId}/participants`}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-sky-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">View Participants</div>
                      <div className="text-xs sm:text-sm text-gray-600">See who is in this course</div>
                    </div>
                  </Link>
                )}

                <Link 
                  href={`/courses/${courseId}/gradebook`} 
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-purple-50 transition-colors group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">View Gradebook</div>
                    <div className="text-xs sm:text-sm text-gray-600">Check your grades and progress</div>
                  </div>
                </Link>


                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <Link 
                    href={`/courses/${courseId}/edit`} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-emerald-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Edit Course</div>
                      <div className="text-xs sm:text-sm text-gray-600">Modify course details</div>
                    </div>
                  </Link>
                </RoleGuard>

                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-purple-50 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Backup Course</div>
                      <div className="text-xs sm:text-sm text-gray-600">Download course backup</div>
                    </div>
                    <CourseBackupButton 
                      courseId={courseId} 
                      courseTitle={course?.title || 'Course'}
                      userRole={profile?.role || 'student'}
                      className="ml-auto"
                    />
                  </div>
                </RoleGuard>

                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-orange-50 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Restore Course</div>
                      <div className="text-xs sm:text-sm text-gray-600">Upload course backup ZIP</div>
                    </div>
                    <CourseRestoreButton 
                      onRestoreComplete={(newCourseId) => {
                        window.location.href = `/course/${newCourseId}`;
                      }}
                      className="ml-auto"
                    />
                  </div>
                </RoleGuard>

                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <Link 
                    href={`/lessons/create?course_id=${courseId}`} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-green-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Create Lesson</div>
                      <div className="text-xs sm:text-sm text-gray-600">Add new content</div>
                    </div>
                  </Link>
                </RoleGuard>

                <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                  <Link 
                    href={`/courses/${courseId}/participants`} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Manage Participants</div>
                      <div className="text-xs sm:text-sm text-gray-600">View, add, and manage students</div>
                    </div>
                  </Link>
                </RoleGuard>
              </div>
              </div>
            </div>

            {/* Gradebook Card */}
            <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Gradebook
                  </h3>
                  <p className="text-purple-100 text-xs sm:text-sm">Manage student grades and assessments</p>
                </div>
                <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                  <Link 
                    href={`/courses/${courseId}/gradebook`} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-purple-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">View Gradebook</div>
                      <div className="text-xs sm:text-sm text-gray-600">See all student grades</div>
                    </div>
                  </Link>

                  <Link 
                    href={`/courses/${courseId}/gradebook/setup`} 
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm sm:text-base">Setup Gradebook</div>
                      <div className="text-xs sm:text-sm text-gray-600">Configure grading settings</div>
                    </div>
                  </Link>
                </div>
              </div>
            </RoleGuard>

            {/* Course Groups */}
            <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setIsGroupsOpen(!isGroupsOpen)}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:from-teal-600 hover:to-emerald-600 transition-colors"
                >
                  <div className="flex items-center">
                    <Icon icon="mdi:account-group" className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-white" />
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-bold text-white">Course Groups</h3>
                      <p className="text-teal-100 text-xs sm:text-sm">Manage student groups for assignments</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-white transition-transform duration-200 ${isGroupsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isGroupsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 sm:p-6">
                    <CourseGroupsManager courseId={courseId} />
                  </div>
                </div>
              </div>
            </RoleGuard>

            {/* Session Recordings */}
            <SessionRecordingsCard courseId={courseId} />

            {/* Resource Links */}
            <ResourceLinksSidebar courseId={courseId} />
          </div>
        </div>
      </div>
    </div>
  );
}
