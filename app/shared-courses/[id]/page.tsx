'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import ProgressVisualization from '@/app/components/ProgressVisualization';
import type { CourseFormat } from '@/app/components/course/CourseFormatSelector';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';

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
} from '@/app/components/course';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Lesson {
  id: string; title: string; description: string | null; order: number;
  estimated_time: number; content_type: string; published: boolean;
  completed: boolean; section_id?: string | null; difficulty?: number;
  prerequisite_lesson_id?: string | null;
}

interface CourseSection {
  id: string; course_id?: string; title: string; description: string | null;
  order: number; start_date: string | null; end_date: string | null;
  collapsed?: boolean; published: boolean;
}

interface CourseDetail {
  share_id: string;
  permission: string;
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
  sections: CourseSection[];
  conferences: Array<{ id: string; title: string; description: string | null; status: string; meeting_url: string | null; video_provider: string; scheduled_at: string | null; instructor: { id: string; name: string; email: string } | null }>;
  resource_links: any[];
  recordings: any[];
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

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load shared course (${res.status})`);
        console.error('Shared course API error:', res.status, errData);
        return;
      }
      setData(await res.json());
    } catch (err) {
      console.error('Shared course fetch error:', err);
      setError('Network error loading course. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, { method: 'POST' });
      if (res.ok) fetchCourse();
      else { const d = await res.json(); alert(d.error || 'Failed to enroll'); }
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

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-display text-gray-900 mb-2">Unable to Load Shared Course</h2>
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-500 mb-4 text-left font-mono">
            Share ID: {shareId}
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { setError(null); setLoading(true); fetchCourse(); }} className="text-sm text-blue-600 hover:underline">
              Try Again
            </button>
            <a href="/shared-courses" className="text-sm text-gray-500 hover:underline">
              Back to Catalog
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading skeleton (same as regular course page) ────────────────────────

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="h-64 sm:h-80 animate-pulse" style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))', opacity: 0.7 }}>
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 space-y-4">
                <div className="h-4 w-32 bg-white/20 rounded" />
                <div className="h-10 w-3/4 bg-white/20 rounded" />
                <div className="h-5 w-1/2 bg-white/15 rounded" />
              </div>
              <div className="w-full sm:w-80 h-48 sm:h-64 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
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
  }

  const { course, lessons, instructors, quizzes, assignments, discussions, surveys, sections, conferences, enrollment } = data;
  const isEnrolled = enrollment?.status === 'active';
  const publishedLessons = lessons.filter(l => l.published);
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

  const rendererSections = sections.map(s => ({
    id: s.id, course_id: course.id, title: s.title, description: s.description,
    order: s.order, start_date: s.start_date, end_date: s.end_date,
    collapsed: s.collapsed || false, published: s.published,
  }));

  const lessonProgressData = lessons.map(l => ({
    lesson_id: l.id,
    status: l.completed ? 'completed' as const : 'not_started' as const,
    completed_at: null,
  }));

  // ─── Course overview (same layout as regular course page) ─────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <CourseHero
        course={course}
        lessonCount={lessons.length}
        sourceTenantName={data.source_tenant?.name}
        instructorNames={instructors.map(i => i.name)}
      />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shared Courses', href: '/shared-courses' },
            { label: course.title },
          ]}
          className="mb-6"
        />

        {progress && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200/80 p-5">
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
            <CourseOverview syllabus={course.syllabus} />

            <CourseStatistics
              lessonCount={lessons.length}
              estimatedDuration={course.estimated_duration}
              difficulty={course.difficulty || 'All Levels'}
              modality={course.modality}
            />

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
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <CourseEnrollmentCard
              course={course}
              lessonCount={publishedLessons.length}
              enrollmentStatus={isEnrolled ? 'enrolled' : 'not_enrolled'}
              enrolling={enrolling}
              onEnroll={handleEnroll}
              onDrop={handleDrop}
              onStartLearning={isEnrolled && publishedLessons.length > 0 ? () => {
                const first = publishedLessons.find(l => !l.completed) || publishedLessons[0];
                router.push(`/shared-courses/${shareId}/lesson/${first.id}`);
              } : undefined}
              sourceTenantName={data.source_tenant?.name}
              progress={progress}
              collapsible
            />

            <CourseLiveSessions
              courseId={course.id}
              isInstructor={false}
              conferences={conferences}
              isEnrolled={isEnrolled}
              collapsible
            />

            <CourseAssessments
              courseId={course.id}
              quizzes={quizzes}
              assignments={assignments}
              discussions={discussions.filter(d => d.is_graded)}
              userRole={null}
              isEnrolled={isEnrolled ?? false}
              readOnly
              collapsible
            />

            <CourseEvaluations
              courseId={course.id}
              surveys={surveys}
              userRole={null}
              isEnrolled={isEnrolled ?? false}
              readOnly
              collapsible
            />

            <CourseTeam
              courseId={course.id}
              instructors={instructors}
              userRole={null}
              editable={false}
              collapsible
            />

            <SessionRecordingsCard courseId={course.id} collapsible />
            <ResourceLinksSidebar courseId={course.id} collapsible />
          </div>
        </div>
      </div>
    </div>
  );
}
