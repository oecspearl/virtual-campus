'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import LessonViewer from '@/app/components/LessonViewer';
import Breadcrumb from '@/app/components/Breadcrumb';
import ProgressVisualization from '@/app/components/ProgressVisualization';
import type { CourseFormat } from '@/app/components/CourseFormatSelector';
import { sanitizeHtml } from '@/lib/sanitize';
import { formatModality, getModalityIcon, getContentTypeIcon, getLinkTypeIcon, formatDuration } from '@/app/components/course/helpers';

// Extracted shared components
import {
  CourseHero,
  CourseOverview,
  CourseStatistics,
  CourseLiveSessions,
  CourseCurriculum,
  CourseAssessments,
  CourseEvaluations,
  CourseTeam,
} from '@/app/components/course';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  order: number;
  estimated_time: number;
  content_type: string;
  published: boolean;
  completed: boolean;
  section_id?: string | null;
  difficulty?: number;
  prerequisite_lesson_id?: string | null;
}

interface CourseSection {
  id: string;
  course_id?: string;
  title: string;
  description: string | null;
  order: number;
  start_date: string | null;
  end_date: string | null;
  collapsed?: boolean;
  published: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  passing_score: number | null;
  published: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  published: boolean;
}

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  is_graded: boolean;
  max_score: number | null;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
}

interface Conference {
  id: string;
  title: string;
  description: string | null;
  status: string;
  meeting_url: string | null;
  video_provider: string;
  scheduled_at: string | null;
  instructor: { id: string; name: string; email: string } | null;
}

interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  link_type: string;
  icon: string | null;
  order: number;
}

interface Recording {
  id: string;
  recording_url: string;
  title: string | null;
  recording_duration: number | null;
  created_at: string;
  conference: { id: string; title: string; scheduled_at: string | null; course_id: string } | null;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
}

interface CourseDetail {
  share_id: string;
  permission: string;
  source_tenant: { id: string; name: string; slug: string } | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    difficulty: string;
    subject_area: string | null;
    estimated_duration: string | null;
    modality: string;
    syllabus: string | null;
    course_format: string | null;
    start_date: string | null;
  };
  lessons: Lesson[];
  instructors: Instructor[];
  quizzes: Quiz[];
  assignments: Assignment[];
  discussions: Discussion[];
  surveys: Survey[];
  sections: CourseSection[];
  conferences: Conference[];
  resource_links: ResourceLink[];
  recordings: Recording[];
  enrollment: {
    id: string;
    status: string;
    progress_percentage: number;
    enrolled_at: string;
    completed_at: string | null;
  } | null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SharedCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const shareId = params.id;

  const [data, setData] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/shared-courses/${shareId}`);
      if (!res.ok) {
        router.push('/shared-courses');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      router.push('/shared-courses');
    } finally {
      setLoading(false);
    }
  }, [shareId, router]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, { method: 'POST' });
      if (res.ok) {
        fetchCourse();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to enroll');
      }
    } catch {
      alert('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleDrop = async () => {
    if (!confirm('Are you sure you want to drop this course?')) return;
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/enroll`, { method: 'DELETE' });
      if (res.ok) {
        fetchCourse();
      }
    } catch {
      console.error('Error dropping course');
    }
  };

  const handleMarkComplete = async (lessonId: string) => {
    if (!data?.enrollment) return;
    setMarkingComplete(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, completed: true }),
      });
      if (res.ok) {
        fetchCourse();
      }
    } catch {
      console.error('Error marking lesson complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  const loadLesson = useCallback(async (lesson: Lesson) => {
    setActiveLesson(lesson);
    setLessonLoading(true);
    setLessonContent(null);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/lessons?lesson_id=${lesson.id}`);
      if (res.ok) {
        const json = await res.json();
        setLessonContent(json.lesson);
      }
    } catch {
      console.error('Error loading lesson content');
    } finally {
      setLessonLoading(false);
    }
  }, [shareId]);

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  const { course, lessons, instructors, quizzes, assignments, discussions, surveys, sections, conferences, resource_links, recordings, enrollment } = data;
  const isEnrolled = enrollment?.status === 'active';

  // Compute progress
  const completedLessons = lessons.filter(l => l.completed).length;
  const totalLessons = lessons.length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Lesson navigation
  const publishedLessons = lessons.filter(l => l.published);
  const activeLessonIndex = activeLesson ? publishedLessons.findIndex(l => l.id === activeLesson.id) : -1;
  const prevLesson = activeLessonIndex > 0 ? publishedLessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex < publishedLessons.length - 1 ? publishedLessons[activeLessonIndex + 1] : null;

  // Determine course format
  const courseFormat: CourseFormat = (course.course_format as CourseFormat) || 'lessons';

  // Map lessons for CourseFormatRenderer
  const rendererLessons = publishedLessons.map(l => ({
    id: l.id,
    title: l.title,
    description: l.description || '',
    estimated_time: l.estimated_time || 0,
    difficulty: l.difficulty || 0,
    order: l.order,
    published: l.published,
    section_id: l.section_id,
    content_type: l.content_type,
    prerequisite_lesson_id: l.prerequisite_lesson_id || null,
  }));

  // Map sections for CourseFormatRenderer
  const rendererSections = sections.map(s => ({
    id: s.id,
    course_id: course.id,
    title: s.title,
    description: s.description,
    order: s.order,
    start_date: s.start_date,
    end_date: s.end_date,
    collapsed: s.collapsed || false,
    published: s.published,
  }));

  // Map lesson progress for CourseFormatRenderer
  const lessonProgressData = lessons.map(l => ({
    lesson_id: l.id,
    status: l.completed ? 'completed' as const : 'not_started' as const,
    completed_at: null,
  }));

  // ─── Active lesson view (full-width lesson player) ────────────────────────

  if (activeLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Sticky header with progress */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveLesson(null)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 flex-shrink-0"
                >
                  <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
                  <span className="hidden sm:inline">Back to Course</span>
                </button>
                <div className="w-px h-6 bg-gray-300 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{activeLesson.title}</span>
              </div>
              <div className="flex items-center gap-3">
                {isEnrolled && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs text-gray-500">{completedLessons}/{totalLessons}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {isEnrolled && (
            <div className="w-full bg-gray-100 h-0.5">
              <div className="bg-blue-600 h-0.5 transition-all" style={{ width: `${progressPercentage}%` }} />
            </div>
          )}
        </div>

        <div className="mx-auto max-w-8xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lesson Content (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              {lessonContent?.lesson_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Icon icon="material-symbols:info" className="w-4 h-4" />
                    Instructions
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700 rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lessonContent.lesson_instructions) }} />
                </div>
              )}

              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-6 min-h-[200px]">
                  {lessonLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : lessonContent ? (
                    <LessonViewer
                      content={lessonContent.content || []}
                      lessonId={activeLesson.id}
                      courseId={course.id}
                      lessonTitle={activeLesson.title}
                    />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Icon icon="material-symbols:error" className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Unable to load lesson content</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mark Complete / Navigation */}
              <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow border border-gray-100">
                <div>
                  {prevLesson && (
                    <button
                      onClick={() => loadLesson(prevLesson)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Icon icon="material-symbols:chevron-left" className="w-5 h-5" />
                      Previous
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isEnrolled && !activeLesson.completed && (
                    <button
                      onClick={() => handleMarkComplete(activeLesson.id)}
                      disabled={markingComplete}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
                      {markingComplete ? 'Saving...' : 'Mark Complete'}
                    </button>
                  )}
                  {activeLesson.completed && (
                    <span className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg flex items-center gap-1">
                      <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
                      Completed
                    </span>
                  )}
                </div>
                <div>
                  {nextLesson && (
                    <button
                      onClick={() => loadLesson(nextLesson)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Next
                      <Icon icon="material-symbols:chevron-right" className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson Sidebar (1 col) */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Course Lessons</h3>
                  <p className="text-xs text-gray-500">{completedLessons} of {totalLessons} completed</p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                  {publishedLessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => loadLesson(lesson)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition ${
                        lesson.id === activeLesson.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        lesson.completed ? 'bg-green-100 text-green-600' :
                        lesson.id === activeLesson.id ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {lesson.completed ? (
                          <Icon icon="material-symbols:check" className="w-3.5 h-3.5" />
                        ) : (
                          <Icon icon={getContentTypeIcon(lesson.content_type)} className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className={`text-sm truncate ${
                        lesson.id === activeLesson.id ? 'font-medium text-blue-900' : 'text-gray-700'
                      }`}>
                        {lesson.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Course overview (3-column layout) ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <CourseHero
        course={course}
        lessonCount={lessons.length}
        sourceTenantName={data.source_tenant?.name}
        instructorNames={instructors.map(i => i.name)}
      />

      <div className="mx-auto max-w-8xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shared Courses', href: '/shared-courses' },
            { label: course.title },
          ]}
          className="mb-6"
        />

        {/* Progress Visualization */}
        {isEnrolled && totalLessons > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <ProgressVisualization
              total={totalLessons}
              completed={completedLessons}
              percentage={progressPercentage}
              label="Course Progress"
              size="lg"
              variant="list"
            />
          </div>
        )}

        {/* 3-column grid */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Main Content (2 cols) */}
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
            {conferences.length > 0 && (
              <CourseLiveSessions
                courseId={course.id}
                isInstructor={false}
                conferences={conferences}
                isEnrolled={isEnrolled}
              />
            )}

            {/* Course Curriculum */}
            <CourseCurriculum
              courseId={course.id}
              lessons={rendererLessons}
              sections={rendererSections}
              courseFormat={courseFormat}
              lessonProgress={lessonProgressData}
              readOnly={true}
            />

            {/* Course Assessments */}
            <CourseAssessments
              courseId={course.id}
              quizzes={quizzes}
              assignments={assignments}
              discussions={discussions.filter(d => d.is_graded)}
              userRole={null}
              isEnrolled={isEnrolled ?? false}
              readOnly={true}
            />

            {/* Course Evaluations */}
            <CourseEvaluations
              courseId={course.id}
              surveys={surveys}
              userRole={null}
              isEnrolled={isEnrolled ?? false}
              readOnly={true}
            />

            {/* Course Team */}
            {instructors.length > 0 && (
              <CourseTeam
                courseId={course.id}
                instructors={instructors}
                userRole={null}
                editable={false}
              />
            )}
          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Enrollment Card — custom for shared courses */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Get Started</h3>
                <p className="text-blue-100 text-xs sm:text-sm">
                  {data.source_tenant ? `From ${data.source_tenant.name}` : 'Join this course today'}
                </p>
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
                    <span className="font-medium text-gray-900">{publishedLessons.length}</span>
                  </div>
                  {course.subject_area && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Subject</span>
                      <span className="font-medium text-gray-900">{course.subject_area}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 sm:mt-6">
                  {isEnrolled ? (
                    <div className="text-center space-y-2 sm:space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enrolled
                      </div>
                      {publishedLessons.length > 0 && (
                        <button
                          onClick={() => {
                            const firstIncomplete = publishedLessons.find(l => !l.completed);
                            loadLesson(firstIncomplete || publishedLessons[0]);
                          }}
                          className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {completedLessons > 0 ? 'Continue Learning' : 'Start Learning'}
                        </button>
                      )}
                      <button
                        onClick={handleDrop}
                        className="block w-full text-center text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Drop Course
                      </button>
                    </div>
                  ) : enrollment?.status === 'completed' ? (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
                        <Icon icon="material-symbols:check-circle" className="w-5 h-5" />
                        Completed
                      </div>
                    </div>
                  ) : data.permission === 'enroll' ? (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none text-sm sm:text-base"
                    >
                      {enrolling ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs sm:text-sm">Enrolling...</span>
                        </div>
                      ) : (
                        'Enroll Now'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (publishedLessons.length > 0) loadLesson(publishedLessons[0]);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 sm:py-3 rounded-lg transition-all text-sm sm:text-base"
                    >
                      View Course Content
                    </button>
                  )}
                </div>

                {/* Sidebar progress */}
                {isEnrolled && totalLessons > 0 && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Your Progress</span>
                      <span className="text-xs sm:text-sm text-gray-600">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{completedLessons} of {totalLessons} lessons completed</p>
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
                    href={`/course/${course.id}/announcements`}
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
                    href={`/course/${course.id}/discussions`}
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

                  <Link
                    href={`/courses/${course.id}/gradebook`}
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
                </div>
              </div>
            </div>

            {/* Session Recordings */}
            {recordings.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 sm:px-6 py-3 sm:py-4">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                    <Icon icon="material-symbols:videocam" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Session Recordings
                  </h3>
                  <p className="text-rose-100 text-xs sm:text-sm">Watch past session recordings</p>
                </div>
                <div className="p-4 sm:p-6 space-y-3">
                  {recordings.slice(0, 5).map(rec => (
                    <a
                      key={rec.id}
                      href={rec.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-rose-50 transition-colors group"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center group-hover:bg-rose-200 transition-colors flex-shrink-0">
                        <Icon icon="material-symbols:play-circle" className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {rec.title || rec.conference?.title || 'Recording'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                          {rec.recording_duration && (
                            <span>{formatDuration(rec.recording_duration)}</span>
                          )}
                        </div>
                      </div>
                      <Icon icon="material-symbols:open-in-new" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </a>
                  ))}
                  {recordings.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">+{recordings.length - 5} more recordings</p>
                  )}
                </div>
              </div>
            )}

            {/* Resource Links */}
            {resource_links.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 sm:px-6 py-3 sm:py-4">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                    <Icon icon="material-symbols:link" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Resource Links
                  </h3>
                  <p className="text-amber-100 text-xs sm:text-sm">Helpful materials and references</p>
                </div>
                <div className="p-4 sm:p-6 space-y-2">
                  {resource_links.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-50 transition-colors group"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors flex-shrink-0">
                        <Icon icon={getLinkTypeIcon(link.link_type)} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{link.title}</div>
                        {link.description && (
                          <div className="text-xs text-gray-500 truncate">{link.description}</div>
                        )}
                      </div>
                      <Icon icon="material-symbols:open-in-new" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
