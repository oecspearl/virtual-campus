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
import SectionManager, { type Section } from '@/app/components/SectionManager';
import { sanitizeHtml } from '@/lib/sanitize';
import ResourceLinksSidebar from '@/app/components/ResourceLinksSidebar';
import Breadcrumb from '@/app/components/Breadcrumb';
import ProgressVisualization from '@/app/components/ProgressVisualization';
import { logCourseAccess } from '@/lib/activity-tracker';
import CourseBackupButton from '@/app/components/CourseBackupButton';
import CourseRestoreButton from '@/app/components/CourseRestoreButton';
import SessionRecordingsCard from '@/app/components/SessionRecordingsCard';
import DiscussionList from '@/app/components/DiscussionList';
import StudentGradebook from '@/app/components/StudentGradebook';
import StreamlinedGradebook from '@/app/components/StreamlinedGradebook';
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
  CourseTabBar,
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
  const [activeTab, setActiveTab] = React.useState('overview');
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
  const [isGradebookOpen, setIsGradebookOpen] = React.useState(false);
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
        const [quizzesResult, assignmentsResult, discussionsResult] = await Promise.allSettled([
          fetch(`/api/quizzes?course_id=${courseId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch(`/api/assignments?course_id=${courseId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch(`/api/courses/${courseId}/discussions`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        ]);

        if (quizzesResult.status === 'fulfilled' && quizzesResult.value) {
          setCourseQuizzes((quizzesResult.value.quizzes || []).filter((q: any) => q.published));
        }
        if (assignmentsResult.status === 'fulfilled' && assignmentsResult.value) {
          setCourseAssignments(assignmentsResult.value.assignments || []);
        }
        if (discussionsResult.status === 'fulfilled' && discussionsResult.value) {
          setGradedDiscussions((discussionsResult.value.discussions || []).filter((d: any) => d.is_graded));
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Skeleton Hero */}
      <div className="h-64 sm:h-80 animate-pulse" style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))', opacity: 0.7 }}>
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="h-4 w-32 bg-white/20 rounded" />
              <div className="h-10 w-3/4 bg-white/20 rounded" />
              <div className="h-5 w-1/2 bg-white/15 rounded" />
              <div className="flex gap-3 mt-4">
                <div className="h-4 w-20 bg-white/15 rounded" />
                <div className="h-4 w-20 bg-white/15 rounded" />
                <div className="h-4 w-20 bg-white/15 rounded" />
              </div>
            </div>
            <div className="w-full sm:w-80 h-48 sm:h-64 bg-white/10 rounded-lg" />
          </div>
        </div>
      </div>
      {/* Skeleton Content */}
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg h-48 animate-pulse" />
            <div className="bg-white rounded-lg h-24 animate-pulse" />
            <div className="bg-white rounded-lg h-64 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-lg h-72 animate-pulse" />
            <div className="bg-white rounded-lg h-32 animate-pulse" />
          </div>
        </div>
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

  const progressPct = progress ? progress.percentage : 0;

  // Curriculum component (reused in overview and curriculum tabs)
  const curriculumBlock = (
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
  );

  // Sidebar (always visible, shared across tabs)
  const sidebar = (
    <aside className="w-full lg:w-[630px] xl:w-[660px] shrink-0 hidden lg:block bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-5 space-y-4">

      {/* Enrollment / Get Started */}
      <div className="rounded-lg border border-gray-200/60 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800">
          <p className="text-sm font-bold text-white">{isInstructor ? 'Course settings' : 'Get started'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{isInstructor ? 'Manage this course' : 'Enrol and begin learning'}</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-4">
            {[
              ['Modality', course.modality || 'Self-paced'],
              ['Difficulty', course.difficulty || 'All Levels'],
              ['Duration', course.estimated_duration || 'Flexible'],
              ['Lessons', String(lessons.length)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">{k}</p>
                <p className="text-[13px] font-semibold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {!isInstructor && enrollmentStatus === 'enrolled' && progress && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-emerald-700 font-medium">Progress</span>
                <span className="font-bold text-emerald-800">{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-200/60">
                <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {isInstructor ? (
            <Link href={`/courses/${courseId}/edit`} className="block w-full py-2.5 rounded-lg text-white text-[13px] font-semibold text-center bg-slate-900 hover:bg-slate-800 transition-colors">
              Edit course settings
            </Link>
          ) : enrollmentStatus === 'enrolled' ? (
            <Link href={lessons[0] ? `/course/${courseId}/lesson/${lessons[0].id}` : '#'} className="block w-full py-2.5 rounded-lg text-white text-[13px] font-semibold text-center bg-emerald-700 hover:bg-emerald-800 transition-colors">
              Continue learning →
            </Link>
          ) : (
            <button onClick={enroll} disabled={enrolling} className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50">
              {enrolling ? 'Enrolling...' : 'Enrol now — Free'}
            </button>
          )}
        </div>
      </div>

      {/* Live Sessions */}
      <CourseLiveSessions courseId={courseId} isInstructor={isInstructor} collapsible />


      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick actions</h3>
        </div>
        <div className="p-2">
          {[
            { href: `/course/${courseId}/announcements`, label: 'Announcements', icon: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75' },
            { href: `/course/${courseId}/discussions`, label: 'Discussions', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' },
            { href: `/course/${courseId}/grades`, label: 'Gradebook', icon: 'M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5' },
          ].map(item => (
            <Link key={item.label} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
          {enrollmentStatus === 'enrolled' && (
            <Link href={`/courses/${courseId}/participants`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Participants
            </Link>
          )}
          <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
            <hr className="my-1 border-gray-100" />
            <Link href={`/courses/${courseId}/edit`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Course Settings
            </Link>
            <Link href={`/lessons/create?course_id=${courseId}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Lesson
            </Link>
          </RoleGuard>
        </div>
      </div>

      {/* Session Recordings */}
      <SessionRecordingsCard courseId={courseId} collapsible />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Hero */}
      <CourseHero course={course} lessonCount={lessons.length} />

      {/* Tab Bar */}
      <CourseTabBar
        courseId={courseId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={profile?.role || 'student'}
      />

      {/* Main content: two-column layout (persistent sidebar) */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-180px)]">

        {/* Left: tab content */}
        <div className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-6 space-y-6 overflow-y-auto">

            {activeTab === 'overview' && (
              <>
                {/* Overview card */}
                <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
                  <div className="px-6 py-5">
                    {course.syllabus ? (
                      <div className="course-overview-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.syllabus) }} />
                    ) : (
                      <p className="text-sm text-gray-400 py-8 text-center">No course overview has been added yet.</p>
                    )}
                  </div>
                  <style>{`
                    .course-overview-content {
                      font-size: 14px;
                      line-height: 1.7;
                      color: #374151;
                    }
                    .course-overview-content h1,
                    .course-overview-content h2,
                    .course-overview-content h3 {
                      color: #0D9488;
                      font-weight: 700;
                      margin: 24px 0 12px;
                      font-size: 17px;
                      letter-spacing: -0.01em;
                    }
                    .course-overview-content h1:first-child,
                    .course-overview-content h2:first-child,
                    .course-overview-content h3:first-child {
                      margin-top: 0;
                    }
                    .course-overview-content p {
                      margin: 0 0 12px;
                      color: #4B5563;
                    }

                    /* Section dividers with centered text */
                    .course-overview-content p:has(strong):only-child,
                    .course-overview-content hr + p {
                      text-align: center;
                    }
                    .course-overview-content hr {
                      border: none;
                      border-top: 1px solid #E5E7EB;
                      margin: 20px 0 8px;
                    }

                    /* Checkmark list items */
                    .course-overview-content ul {
                      list-style: none;
                      padding: 0;
                      margin: 8px 0 16px;
                    }
                    .course-overview-content ul li {
                      display: flex;
                      align-items: flex-start;
                      gap: 10px;
                      padding: 8px 12px;
                      margin: 0;
                      border-radius: 8px;
                      transition: background 150ms;
                    }
                    .course-overview-content ul li:hover {
                      background: #F9FAFB;
                    }

                    /* Ordered list — numbered steps */
                    .course-overview-content ol {
                      list-style: none;
                      padding: 0;
                      margin: 12px 0;
                      counter-reset: step;
                    }
                    .course-overview-content ol li {
                      counter-increment: step;
                      display: flex;
                      align-items: flex-start;
                      gap: 14px;
                      padding: 14px 0;
                      border-bottom: 1px solid #F3F4F6;
                    }
                    .course-overview-content ol li:last-child {
                      border-bottom: none;
                    }
                    .course-overview-content ol li::before {
                      content: counter(step);
                      flex-shrink: 0;
                      width: 28px;
                      height: 28px;
                      border-radius: 50%;
                      background: #0D9488;
                      color: white;
                      font-size: 12px;
                      font-weight: 700;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      margin-top: 2px;
                    }

                    /* Key concept / callout boxes */
                    .course-overview-content blockquote,
                    .course-overview-content div[style*="background"] {
                      border-radius: 10px;
                      padding: 16px 18px;
                      margin: 16px 0;
                      font-size: 13px;
                    }

                    /* Bold text inside steps */
                    .course-overview-content strong {
                      color: #111827;
                      font-weight: 600;
                    }

                    /* Section labels (LEARNING OBJECTIVES, STEP-BY-STEP GUIDE) */
                    .course-overview-content p > strong:only-child {
                      display: block;
                      font-size: 10px;
                      font-weight: 700;
                      letter-spacing: 0.08em;
                      text-transform: uppercase;
                      color: #9CA3AF;
                      text-align: center;
                      padding: 4px 0 8px;
                    }

                    /* Links */
                    .course-overview-content a {
                      color: #0D9488;
                      text-decoration: none;
                      font-weight: 500;
                    }
                    .course-overview-content a:hover {
                      text-decoration: underline;
                    }

                    /* Images */
                    .course-overview-content img {
                      max-width: 100%;
                      border-radius: 8px;
                      margin: 12px 0;
                    }

                    /* Tables */
                    .course-overview-content table {
                      width: 100%;
                      border-collapse: collapse;
                      font-size: 13px;
                      margin: 12px 0;
                    }
                    .course-overview-content th,
                    .course-overview-content td {
                      padding: 8px 12px;
                      border-bottom: 1px solid #E5E7EB;
                      text-align: left;
                    }
                    .course-overview-content th {
                      font-weight: 600;
                      color: #374151;
                      background: #F9FAFB;
                    }
                  `}</style>
                </div>

              </>
            )}

            {activeTab === 'curriculum' && curriculumBlock}

            {activeTab === 'discussions' && (
              <DiscussionList courseId={courseId} />
            )}

            {activeTab === 'assessments' && (
              <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Assessments</h2>
                </div>
                <div className="p-6">
                  <CourseAssessments courseId={courseId} quizzes={courseQuizzes} assignments={courseAssignments} discussions={gradedDiscussions} userRole={profile?.role || null} isEnrolled={enrollmentStatus === 'enrolled'} />
                </div>
              </div>
            )}

            {activeTab === 'grades' && (
              isInstructor
                ? <StreamlinedGradebook courseId={courseId} />
                : <StudentGradebook courseId={courseId} />
            )}

            {activeTab === 'files' && (
              <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Course Files & Resources</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ResourceLinksSidebar courseId={courseId} />
                  <SessionRecordingsCard courseId={courseId} />
                </div>
              </div>
            )}
        </div>

        {/* Right: persistent sidebar */}
        {sidebar}
      </div>
    </div>
  );
}
