'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { sanitizeHtml } from '@/lib/sanitize';
import { formatModality } from '@/app/components/course/helpers';
import type { CourseFormat } from '@/app/components/course/CourseFormatSelector';
import type { Section } from '@/app/components/course/SectionManager';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import DiscussionList from '@/app/components/discussions/DiscussionList';
import SupplementsPanel from '@/app/components/shared-courses/SupplementsPanel';
import MyGradesPanel from '@/app/components/shared-courses/MyGradesPanel';
import LiveSessionsPanel from '@/app/components/shared-courses/LiveSessionsPanel';

import {
  CourseHero,
  CourseLiveSessions,
  CourseCurriculum,
  CourseAssessments,
  CourseEvaluations,
  CourseTeam,
  CourseTabBar,
} from '@/app/components/course';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Lesson {
  id: string; title: string; description: string | null; order: number;
  estimated_time: number; content_type: string; published: boolean;
  completed: boolean; section_id?: string | null; difficulty?: number;
  prerequisite_lesson_id?: string | null;
}

interface CourseDetail {
  share_id: string;
  permission: string;
  can_enroll?: boolean;
  can_add_supplemental_content?: boolean;
  can_schedule_live_sessions?: boolean;
  can_post_grades?: boolean;
  allow_fork?: boolean;
  source_tenant: { id: string; name: string; slug: string } | null;
  course: {
    id: string; title: string; description: string | null; thumbnail: string | null;
    difficulty: string; subject_area: string | null; estimated_duration: string | null;
    modality: string; syllabus: string | null; course_format: string | null;
    start_date: string | null;
  };
  lessons: Lesson[];
  instructors: Array<{ id: string; name: string; email: string }>;
  quizzes: Array<{ id: string; title: string; description: string | null; time_limit: number | null; passing_score: number | null; published: boolean }>;
  assignments: Array<{ id: string; title: string; description: string | null; due_date: string | null; max_score: number | null; published: boolean }>;
  discussions: Array<{ id: string; title: string; description: string | null; is_graded: boolean; max_score: number | null }>;
  surveys: Array<{ id: string; title: string; description: string | null; published: boolean }>;
  sections: Array<{ id: string; course_id?: string; title: string; description: string | null; order: number; start_date: string | null; end_date: string | null; collapsed?: boolean; published: boolean }>;
  conferences: Array<{ id: string; title: string; description: string | null; status: string; meeting_url: string | null; video_provider: string; scheduled_at: string | null; instructor: { id: string; name: string; email: string } | null }>;
  resource_links: any[];
  recordings: any[];
  local_live_sessions?: Array<{
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    meeting_url: string | null;
    provider: 'zoom' | 'teams' | 'meet' | 'jitsi' | 'other';
    status: 'scheduled' | 'live' | 'completed' | 'cancelled';
    instructor: { id: string; name: string; email: string } | null;
  }>;
  supplements?: Array<{
    id: string;
    kind: 'announcement' | 'resource_link';
    title: string;
    description: string | null;
    body: string | null;
    url: string | null;
    link_type: string | null;
    icon: string | null;
    position: number;
    published: boolean;
    created_at: string;
    author: { id: string; name: string } | null;
  }>;
  enrollment: { id: string; status: string; progress_percentage: number; enrolled_at: string; completed_at: string | null } | null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SharedCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const shareId = params.id;

  const [data, setData] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEnrollmentSuccess, setShowEnrollmentSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(p => setUserRole(p?.role || null))
      .catch(() => {});
  }, []);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load shared course (${res.status})`);
        return;
      }
      setData(await res.json());
    } catch (err) {
      console.error('Shared course fetch error:', err);
      setError('Network error loading course.');
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, { method: 'POST' });
      if (res.ok) {
        await fetchCourse();
        setShowEnrollmentSuccess(true);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to enroll');
      }
    } catch { alert('Failed to enroll'); }
    finally { setEnrolling(false); }
  };

  const handleDrop = async () => {
    if (!confirm('Are you sure you want to drop this course?')) return;
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, { method: 'DELETE' });
      if (res.ok) fetchCourse();
    } catch { console.error('Error dropping course'); }
  };

  const handleFork = async () => {
    if (!data) return;
    const confirmMsg =
      `Fork "${data.course.title}" into your institution?\n\n` +
      `This creates an unpublished copy of the course (lessons, sections, quizzes, assignments, grade items) ` +
      `in your tenant. Your instructors own the copy and can edit it freely. The copy will not stay in sync with ` +
      `the source.`;
    if (!confirm(confirmMsg)) return;
    setForking(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || 'Fork failed');
        return;
      }
      alert(
        `Fork complete.\n\n` +
        `Copied ${result.counts?.lessons ?? 0} lessons, ${result.counts?.quizzes ?? 0} quizzes, ` +
        `${result.counts?.assignments ?? 0} assignments.\n\n` +
        `You'll be redirected to the new course.`
      );
      if (result.course?.id) router.push(`/course/${result.course.id}`);
    } catch (err) {
      console.error('Fork error:', err);
      alert('Fork failed');
    } finally {
      setForking(false);
    }
  };

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:alert-circle" className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Course</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { setError(null); setLoading(true); fetchCourse(); }} className="text-sm text-blue-600 hover:underline">Try Again</button>
            <a href="/shared-courses" className="text-sm text-gray-500 hover:underline">Back to Catalog</a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="h-64 sm:h-80 animate-pulse" style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))', opacity: 0.7 }} />
        <div className="h-10 bg-white border-b border-gray-200 animate-pulse" />
        <div className="flex flex-col lg:flex-row min-h-[50vh]">
          <div className="flex-1 p-6 space-y-4">
            <div className="bg-white rounded-lg h-48 animate-pulse" />
            <div className="bg-white rounded-lg h-64 animate-pulse" />
          </div>
          <div className="w-full lg:w-[340px] p-5 space-y-4 border-l border-gray-200">
            <div className="bg-white rounded-lg h-72 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const { course, lessons, instructors, quizzes, assignments, discussions, surveys, sections, conferences, enrollment } = data;
  const isEnrolled = enrollment?.status === 'active';
  const publishedLessons = lessons.filter(l => l.published).sort((a, b) => a.order - b.order);
  const completedLessons = lessons.filter(l => l.completed).length;
  const totalLessons = lessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const progress = isEnrolled ? { total: totalLessons, completed: completedLessons, percentage: progressPct } : null;
  const courseFormat: CourseFormat = (course.course_format as CourseFormat) || 'lessons';

  const rendererLessons = publishedLessons.map(l => ({
    id: l.id, title: l.title, description: l.description || '', estimated_time: l.estimated_time || 0,
    difficulty: l.difficulty || 0, order: l.order, published: l.published, section_id: l.section_id,
    content_type: l.content_type, prerequisite_lesson_id: l.prerequisite_lesson_id || null,
  }));

  const rendererSections: Section[] = sections.map(s => ({
    id: s.id, course_id: course.id, title: s.title, description: s.description,
    order: s.order, start_date: s.start_date, end_date: s.end_date,
    collapsed: s.collapsed || false, published: s.published,
  }));

  const lessonProgressData = lessons.map(l => ({
    lesson_id: l.id,
    status: l.completed ? 'completed' as const : 'not_started' as const,
    completed_at: null,
  }));

  const firstLesson = publishedLessons.find(l => !l.completed) || publishedLessons[0];

  // ─── Sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <aside className="w-full lg:w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 hidden lg:block bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-5 space-y-4">

        {/* Source tenant badge */}
        {data.source_tenant && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <Icon icon="mdi:domain" className="w-4 h-4 shrink-0" />
            <span>Shared by <strong>{data.source_tenant.name}</strong></span>
          </div>
        )}

        {/* Enrollment / Get Started */}
        <div className="rounded-lg border border-gray-200/60 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800">
            <p className="text-sm font-bold text-white">Get started</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Enrol and begin learning</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-4">
              {[
                ['Modality', course.modality || 'Self-paced'],
                ['Difficulty', course.difficulty || 'All Levels'],
                ['Duration', course.estimated_duration || 'Flexible'],
                ['Lessons', String(publishedLessons.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">{k}</p>
                  <p className="text-[13px] font-semibold text-gray-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {isEnrolled && progress && (
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

            {isEnrolled ? (
              <Link
                href={firstLesson ? `/shared-courses/${shareId}/lesson/${firstLesson.id}` : '#'}
                className="block w-full py-2.5 rounded-lg text-white text-[13px] font-semibold text-center bg-emerald-700 hover:bg-emerald-800 transition-colors"
              >
                Continue learning →
              </Link>
            ) : (
              <button onClick={handleEnroll} disabled={enrolling} className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50">
                {enrolling ? 'Enrolling...' : 'Enrol now — Free'}
              </button>
            )}

            {isEnrolled && (
              <button onClick={handleDrop} className="w-full mt-2 py-2 rounded-lg text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors">
                Drop course
              </button>
            )}
          </div>
        </div>

        {/* Fork to my tenant — staff only, when allowed by the share */}
        {data.allow_fork &&
          userRole &&
          ['admin', 'super_admin', 'tenant_admin', 'curriculum_designer', 'instructor'].includes(userRole) && (
          <div className="rounded-lg border border-gray-200/60 p-4 bg-gradient-to-br from-rose-50 to-amber-50">
            <div className="flex items-start gap-2 mb-2">
              <Icon icon="mdi:source-branch" className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Fork to your institution</p>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Make an editable copy owned by {data.source_tenant ? 'your' : 'your'} institution. The copy won&apos;t stay in sync with the source.
                </p>
              </div>
            </div>
            <button
              onClick={handleFork}
              disabled={forking}
              className="w-full py-2 rounded-lg text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {forking ? 'Forking…' : 'Fork this course'}
            </button>
          </div>
        )}

        {/* Gradebook link — staff, when grade posting is enabled */}
        {data.can_post_grades &&
          userRole &&
          ['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'].includes(userRole) && (
          <Link
            href={`/shared-courses/${shareId}/grades`}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200/60 bg-white hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon icon="mdi:check-decagram-outline" className="w-5 h-5 text-blue-600" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Gradebook</span>
                <span className="block text-[11px] text-gray-500">
                  Post grades for your students on source assessments
                </span>
              </span>
            </span>
            <Icon icon="mdi:chevron-right" className="w-4 h-4 text-gray-400" />
          </Link>
        )}

        {/* Student's own grades — only when enrolled */}
        {isEnrolled && (
          <MyGradesPanel
            shareId={shareId}
            assessments={[
              ...quizzes.map((q) => ({ id: q.id, title: q.title, type: 'quiz' as const })),
              ...assignments.map((a) => ({ id: a.id, title: a.title, type: 'assignment' as const })),
            ]}
          />
        )}

        {/* Target-tenant supplements (announcements + resource links) */}
        <SupplementsPanel
          shareId={shareId}
          canEdit={
            !!userRole &&
            ['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'].includes(userRole)
          }
          canAddSupplementalContent={!!data.can_add_supplemental_content}
          initial={data.supplements as any}
        />

        {/* Live Sessions — source tenant's */}
        <CourseLiveSessions courseId={course.id} isInstructor={false} conferences={conferences} isEnrolled={isEnrolled} collapsible />

        {/* Target-tenant live sessions (scheduled locally on this share) */}
        <LiveSessionsPanel
          shareId={shareId}
          canEdit={
            !!userRole &&
            ['super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer'].includes(userRole)
          }
          canScheduleLiveSessions={!!data.can_schedule_live_sessions}
          initial={data.local_live_sessions as any}
        />

        {/* Session Recordings */}
        <SessionRecordingsCard courseId={course.id} collapsible />
      </div>
    </aside>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Enrollment Success Overlay */}
      {showEnrollmentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' }}
            >
              <Icon icon="mdi:check-circle" className="w-10 h-10" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">You&apos;re In!</h2>
            <p className="text-sm text-gray-500 mb-5">
              You&apos;ve successfully enrolled in <span className="font-medium text-gray-700">{course.title}</span>
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Icon icon="mdi:book-open-page-variant-outline" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                <span>{publishedLessons.length} lesson{publishedLessons.length !== 1 ? 's' : ''} to complete</span>
              </div>
              {course.estimated_duration && (
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                  <Icon icon="mdi:clock-outline" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                  <span>Estimated {course.estimated_duration}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                <Icon icon="mdi:signal-cellular-3" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                <span>{formatModality(course.modality)} learning</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {firstLesson ? (
                <Link
                  href={`/shared-courses/${shareId}/lesson/${firstLesson.id}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
                >
                  <Icon icon="mdi:play-circle" className="w-5 h-5" />
                  Start First Lesson
                </Link>
              ) : (
                <button onClick={() => setShowEnrollmentSuccess(false)} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
                  Explore Course
                </button>
              )}
              <button onClick={() => setShowEnrollmentSuccess(false)} className="text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors">
                View Course Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <CourseHero
        course={course}
        lessonCount={publishedLessons.length}
        sourceTenantName={data.source_tenant?.name}
        instructorNames={instructors.map(i => i.name)}
      />

      {/* Tab Bar */}
      <CourseTabBar
        courseId={course.id}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="student"
      />

      {/* Mobile-only sticky action bar */}
      <div className="lg:hidden sticky top-[41px] z-30 bg-white border-b border-gray-200/80 px-4 py-3">
        {isEnrolled ? (
          <Link
            href={firstLesson ? `/shared-courses/${shareId}/lesson/${firstLesson.id}` : '#'}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
          >
            <Icon icon="mdi:play-circle" className="w-4 h-4" />
            {progress && progress.percentage > 0 ? `Continue (${progress.percentage}%)` : 'Start Learning'}
          </Link>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
          >
            <Icon icon="mdi:school" className="w-4 h-4" />
            {enrolling ? 'Enrolling...' : 'Enroll in Course'}
          </button>
        )}
      </div>

      {/* Main content: two-column layout (persistent sidebar) */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-180px)]">

        {/* Left: tab content */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 space-y-6 overflow-y-auto overflow-x-hidden">

          {activeTab === 'overview' && (
            <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
              <div className="px-6 py-5">
                {course.syllabus ? (
                  <div className="course-overview-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.syllabus) }} />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No course overview has been added yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'curriculum' && (
            <CourseCurriculum
              courseId={course.id}
              lessons={rendererLessons}
              sections={rendererSections}
              courseFormat={courseFormat}
              lessonProgress={lessonProgressData}
              courseStartDate={course.start_date}
              readOnly
              onLessonClick={(lessonId) => {
                router.push(`/shared-courses/${shareId}/lesson/${lessonId}`);
              }}
            />
          )}

          {activeTab === 'discussions' && (
            <DiscussionList courseId={course.id} />
          )}

          {activeTab === 'grades' && isEnrolled && (
            <div className="bg-white rounded-lg border border-gray-200/60 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Grades</h2>
              <CourseAssessments
                courseId={course.id}
                quizzes={quizzes}
                assignments={assignments}
                discussions={discussions.filter(d => d.is_graded)}
                userRole={null}
                isEnrolled={isEnrolled}
                readOnly
              />
              <div className="mt-6">
                <CourseEvaluations
                  courseId={course.id}
                  surveys={surveys}
                  userRole={null}
                  isEnrolled={isEnrolled}
                  readOnly
                />
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
