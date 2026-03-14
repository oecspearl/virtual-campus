'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import { useSupabase } from '@/lib/supabase-provider';
import CourseGroupsManager from '@/app/components/CourseGroupsManager';
import CohortManager from '@/app/components/CohortManager';
import { type CourseFormat } from '@/app/components/CourseFormatSelector';
import { type Section } from '@/app/components/SectionManager';
import ResourceLinksSidebar from '@/app/components/ResourceLinksSidebar';
import Breadcrumb from '@/app/components/Breadcrumb';
import ProgressVisualization from '@/app/components/ProgressVisualization';
import { logCourseAccess } from '@/lib/activity-tracker';
import CourseBackupButton from '@/app/components/CourseBackupButton';
import CourseRestoreButton from '@/app/components/CourseRestoreButton';
import SessionRecordingsCard from '@/app/components/SessionRecordingsCard';
import { formatModality, getModalityIcon } from '@/app/components/course/helpers';

// Extracted shared components
import {
  CourseHero,
  CourseOverview,
  CourseStatistics,
  CourseLiveSessions,
  CourseCurriculum,
  CourseAssessments,
  CourseEvaluations,
  CourseEnrollmentCard,
  CourseTeam,
  SidebarPlayerLayout,
} from '@/app/components/course';

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
  const [editMode, setEditMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lesson-edit-mode') !== 'off';
    }
    return true;
  });
  const [isQuickActionsOpen, setIsQuickActionsOpen] = React.useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = React.useState(false);
  const [isCohortsOpen, setIsCohortsOpen] = React.useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseSurveys, setCourseSurveys] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseQuizzes, setCourseQuizzes] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseAssignments, setCourseAssignments] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gradedDiscussions, setGradedDiscussions] = React.useState<any[]>([]);
  const [courseFormat, setCourseFormat] = React.useState<CourseFormat>('lessons');
  const [sections, setSections] = React.useState<Section[]>([]);
  const [formatSaving, setFormatSaving] = React.useState(false);
  const [showSectionManager, setShowSectionManager] = React.useState(false);
  const [lessonProgress, setLessonProgress] = React.useState<Array<{ lesson_id: string; status: 'not_started' | 'in_progress' | 'completed'; completed_at?: string | null }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
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
        if (cData?.course_format) {
          setCourseFormat(cData.course_format as CourseFormat);
        }
        const lessonsArray = Array.isArray(lData.lessons) ? lData.lessons : [];
        lessonsArray.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setLessons(lessonsArray);
        setProfile(pData);

        try {
          const sectionsRes = await fetch(`/api/courses/${courseId}/sections`, { cache: 'no-store' });
          if (sectionsRes.ok) {
            const sectionsData = await sectionsRes.json();
            setSections(sectionsData.sections || []);
          }
        } catch (err) {
          console.error('Error loading sections:', err);
        }

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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return;

        const res = await fetch(`/api/progress/${profile.id}/course/${courseId}`, {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
          if (data.lessons && Array.isArray(data.lessons)) {
            setLessonProgress(data.lessons.map((lp: any) => ({
              lesson_id: lp.lesson_id,
              status: lp.status || 'not_started',
              completed_at: lp.completed_at || null,
            })));
          }
        }
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

  const handleFormatChange = async (format: CourseFormat) => {
    setCourseFormat(format);
    setFormatSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ course_format: format }),
      });
    } catch (err) {
      console.error('Error saving format:', err);
    } finally {
      setFormatSaving(false);
    }
  };

  const handleAssignSection = async (lessonId: string, sectionId: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ section_id: sectionId }),
      });
      if (res.ok) {
        setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, section_id: sectionId } : l));
      }
    } catch (err) {
      console.error('Error assigning section:', err);
    }
  };

  const handleStartDateChange = async (newDate: string) => {
    setCourse((prev: any) => ({ ...prev, start_date: newDate }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ start_date: newDate || null }),
      });
    } catch (err) {
      console.error('Error saving start date:', err);
    }
  };

  if (!course) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading course...</p>
      </div>
    </div>
  );

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'curriculum_designer' || profile?.role === 'admin' || profile?.role === 'super_admin';

  // Player format: render sidebar-anchored player instead of normal layout
  if (courseFormat === 'player') {
    return (
      <SidebarPlayerLayout
        courseId={courseId}
        courseTitle={course.title}
        lessons={lessons}
        sections={sections}
        lessonProgress={lessonProgress}
        userRole={profile?.role || 'student'}
        userId={profile?.id}
        courseStartDate={course.start_date}
        onExitPlayer={() => handleFormatChange('lessons')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <CourseHero
        course={course}
        lessonCount={lessons.length}
      />

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
            <CourseOverview syllabus={course.syllabus} />

            {/* Course Statistics */}
            <CourseStatistics
              lessonCount={lessons.length}
              estimatedDuration={course.estimated_duration}
              difficulty={course.difficulty || 'All Levels'}
              modality={course.modality}
            />

            {/* Live Sessions */}
            <CourseLiveSessions
              courseId={courseId}
              isInstructor={isInstructor}
            />

            {/* Course Curriculum */}
            <CourseCurriculum
              courseId={courseId}
              lessons={lessons}
              sections={sections}
              courseFormat={courseFormat}
              lessonProgress={lessonProgress}
              editMode={editMode}
              isReorderMode={isReorderMode}
              formatSaving={formatSaving}
              showSectionManager={showSectionManager}
              courseStartDate={course?.start_date}
              onFormatChange={handleFormatChange}
              onToggleReorderMode={toggleReorderMode}
              onReorder={handleLessonReorder}
              onAssignSection={handleAssignSection}
              onSectionsChange={setSections}
              onToggleSectionManager={() => setShowSectionManager(!showSectionManager)}
              onStartDateChange={handleStartDateChange}
            />

            {/* Course Assessments */}
            <CourseAssessments
              courseId={courseId}
              quizzes={courseQuizzes}
              assignments={courseAssignments}
              discussions={gradedDiscussions}
              userRole={profile?.role || null}
              isEnrolled={enrollmentStatus === 'enrolled'}
            />

            {/* Course Evaluations */}
            <CourseEvaluations
              courseId={courseId}
              surveys={courseSurveys}
              userRole={profile?.role || null}
              isEnrolled={enrollmentStatus === 'enrolled'}
            />

            {/* Course Team */}
            <CourseTeam
              courseId={courseId}
              userRole={profile?.role || null}
              editable={true}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Enrollment Card */}
            <CourseEnrollmentCard
              course={course}
              lessonCount={lessons.length}
              enrollmentStatus={enrollmentStatus}
              enrolling={enrolling}
              onEnroll={enroll}
              progress={progress}
            />

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

            {/* Cohorts */}
            <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setIsCohortsOpen(!isCohortsOpen)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:from-indigo-600 hover:to-purple-600 transition-colors"
                >
                  <div className="flex items-center">
                    <Icon icon="mdi:account-group-outline" className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-white" />
                    <div className="text-left">
                      <h3 className="text-base sm:text-lg font-bold text-white">Cohorts</h3>
                      <p className="text-indigo-100 text-xs sm:text-sm">Manage student cohorts and scheduled batches</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-white transition-transform duration-200 ${isCohortsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCohortsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 sm:p-6">
                    <CohortManager courseId={courseId} />
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
