'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import LessonViewer from '@/app/components/lesson/LessonViewer';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import LessonDiscussionsSidebar from '@/app/components/discussions/LessonDiscussionsSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';

/**
 * Shared Course Lesson Page
 * Mirrors the regular lesson page (/course/[id]/lesson/[lessonId]) exactly,
 * but fetches data via the cross-tenant shared course API.
 */
export default function SharedCourseLessonPage() {
  const { id: shareId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = React.useState<any>(null);
  const [courseLessons, setCourseLessons] = React.useState<any[]>([]);
  const [courseData, setCourseData] = React.useState<any>(null);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [lessonProgressMap, setLessonProgressMap] = React.useState<Record<string, boolean>>({});
  const [outcomesOpen, setOutcomesOpen] = React.useState(false);
  const [instructionsOpen, setInstructionsOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch lesson + course data via shared course API
  React.useEffect(() => { (async () => {
    try {
      const [lessonRes, courseRes] = await Promise.all([
        fetch(`/api/shared-courses/${shareId}/lessons?lesson_id=${lessonId}`),
        fetch(`/api/shared-courses/${shareId}`),
      ]);

      if (!lessonRes.ok) {
        const errData = await lessonRes.json().catch(() => ({}));
        setError(errData.error || `Lesson load failed (${lessonRes.status})`);
        setLesson({ error: errData.error || 'Lesson not found' });
        return;
      }

      const lessonData = await lessonRes.json();
      setLesson(lessonData.lesson);

      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourseData(data);

        // Build lesson list and progress map
        const published = (data.lessons || [])
          .filter((l: any) => l.published)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setCourseLessons(published);

        const progressMap: Record<string, boolean> = {};
        for (const l of (data.lessons || [])) {
          progressMap[l.id] = l.completed || false;
        }
        setLessonProgressMap(progressMap);

        if (progressMap[lessonId]) {
          setIsCompleted(true);
        }
      }
    } catch (err) {
      console.error('Error loading shared lesson:', err);
      setError('Network error loading lesson.');
    }
  })(); }, [shareId, lessonId]);

  const markComplete = async () => {
    if (!courseData?.enrollment || isCompleting) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/shared-courses/${shareId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, completed: true }),
      });
      if (res.ok) {
        setIsCompleted(true);
        setLessonProgressMap(prev => ({ ...prev, [lessonId]: true }));
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Loading
  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-slate-200 border-t-slate-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Error
  if (lesson.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-lg border border-red-200 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson Not Available</h2>
          <p className="text-gray-600 mb-4">{lesson.error}</p>
          {error && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-500 mb-4 font-mono text-left">
              <div>Share: {shareId}</div>
              <div>Lesson: {lessonId}</div>
            </div>
          )}
          <Link
            href={`/shared-courses/${shareId}`}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const course = courseData?.course;
  const idx = courseLessons.findIndex(l => l.id === lessonId);
  const prevId = idx > 0 ? courseLessons[idx - 1]?.id : null;
  const nextId = idx >= 0 && idx < courseLessons.length - 1 ? courseLessons[idx + 1]?.id : null;
  const completedCount = courseLessons.filter(l => lessonProgressMap[l.id]).length;
  const progress = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/50" style={{ scrollBehavior: 'smooth' }}>
      {/* Header — matches regular lesson page exactly */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <Link
                href={`/shared-courses/${shareId}`}
                className="flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="min-w-0">
                <h1 className="text-sm font-medium text-slate-800 line-clamp-1">{course?.title || 'Course'}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className="text-xs text-slate-400 tabular-nums">{idx + 1} / {courseLessons.length}</span>
              <div className="w-24 sm:w-32 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-slate-700 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shared Courses', href: '/shared-courses' },
            { label: course?.title || 'Course', href: `/shared-courses/${shareId}` },
            { label: lesson?.title || 'Lesson' },
          ]}
          className="mb-6"
        />

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200/80">
              {/* Lesson Header */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-normal text-slate-900 break-words leading-tight tracking-tight mb-3">{lesson.title}</h1>
                  {lesson.description && (
                    <p className="text-sm sm:text-base text-slate-500 mb-4 leading-relaxed">{lesson.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {lesson.estimated_time && (
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {lesson.estimated_time} min
                      </div>
                    )}
                    {lesson.difficulty && (
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Level {lesson.difficulty}/5
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Learning Outcomes */}
              {Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0 && (
                <div className="mx-5 sm:mx-8 my-5 sm:my-6 pl-4 border-l-2 border-slate-200">
                  <button onClick={() => setOutcomesOpen(!outcomesOpen)} className="flex items-center justify-between w-full text-left group">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Learning Outcomes
                      <span className="ml-2 text-slate-300 normal-case tracking-normal">({lesson.learning_outcomes.length})</span>
                    </h3>
                    <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${outcomesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${outcomesOpen ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <ul className="space-y-2">
                      {lesson.learning_outcomes.map((outcome: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-slate-600 leading-relaxed">
                          <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="break-words">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {lesson.lesson_instructions && (
                <div className="mx-5 sm:mx-8 my-5 sm:my-6 pl-4 border-l-2 border-amber-200">
                  <button onClick={() => setInstructionsOpen(!instructionsOpen)} className="flex items-center justify-between w-full text-left group">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Instructions</h3>
                    <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${instructionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${instructionsOpen ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <div className="prose prose-sm max-w-none text-slate-600 rich-text-content prose-headings:text-slate-800 prose-headings:font-medium" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                  </div>
                </div>
              )}

              {/* Lesson Content */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 min-h-[200px]">
                {lesson.content && Array.isArray(lesson.content) && lesson.content.length > 0 ? (
                  <LessonViewer
                    content={lesson.content}
                    lessonId={lessonId}
                    courseId={course?.id}
                    lessonTitle={lesson.title}
                  />
                ) : lesson.content && typeof lesson.content === 'string' ? (
                  <div className="prose prose-sm max-w-none rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }} />
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-sm">This lesson doesn't have content yet.</p>
                  </div>
                )}
              </div>

              {/* Navigation — matches regular lesson page exactly */}
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-t border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => prevId && router.push(`/shared-courses/${shareId}/lesson/${prevId}`)}
                    disabled={!prevId}
                    className="flex items-center text-sm text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center">
                    {!isCompleted && courseData?.enrollment && (
                      <button
                        onClick={markComplete}
                        disabled={isCompleting}
                        className="flex items-center px-5 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {isCompleting ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-[1.5px] border-teal-600 border-t-transparent mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Mark Complete
                          </>
                        )}
                      </button>
                    )}
                    {isCompleted && (
                      <div className="flex items-center px-5 py-2 text-teal-600 text-sm font-medium">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Completed
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => nextId && router.push(`/shared-courses/${shareId}/lesson/${nextId}`)}
                    disabled={!nextId}
                    className="flex items-center text-sm text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar — matches regular lesson page exactly */}
          <div className="mt-6 sm:mt-8 lg:mt-0">
            <div className="space-y-5">
              {/* Course Progress */}
              <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Course Progress
                  </h3>
                </div>
                <div className="p-3">
                  <div className="space-y-0.5">
                    {courseLessons.map((l, index) => {
                      const isLessonCompleted = lessonProgressMap[l.id] || false;
                      const isCurrent = l.id === lessonId;

                      return (
                        <div
                          key={l.id}
                          className={`flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-slate-50 border-l-2 border-slate-700'
                              : 'hover:bg-gray-50 border-l-2 border-transparent'
                          }`}
                          onClick={() => router.push(`/shared-courses/${shareId}/lesson/${l.id}`)}
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 ${
                            isCurrent
                              ? 'bg-slate-700 text-white'
                              : isLessonCompleted
                                ? 'bg-teal-50 text-teal-600'
                                : 'bg-gray-100 text-slate-400'
                          }`}>
                            {isLessonCompleted && !isCurrent ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${
                              isCurrent ? 'font-medium text-slate-800' : isLessonCompleted ? 'text-slate-500' : 'text-slate-600'
                            }`}>{l.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lesson Discussions */}
              <LessonDiscussionsSidebar courseId={course?.id} lessonId={lessonId} />

              {/* Session Recordings */}
              <SessionRecordingsCard courseId={course?.id} lessonId={lessonId} />

              {/* Resource Links */}
              <ResourceLinksSidebar courseId={course?.id} lessonId={lessonId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
