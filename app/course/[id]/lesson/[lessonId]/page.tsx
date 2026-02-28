'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import LessonViewer from '@/app/components/LessonViewer';
import SCORMPlayer from '@/app/components/SCORMPlayer';
import Button from '@/app/components/Button';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import LessonDiscussionsSidebar from '@/app/components/LessonDiscussionsSidebar';
import VideoConferenceSection from '@/app/components/VideoConferenceSection';
import AITutorWidget from '@/app/components/AITutorWidget';
import ResourceLinksSidebar from '@/app/components/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/SessionRecordingsCard';
import Breadcrumb from '@/app/components/Breadcrumb';
import { logLessonView } from '@/lib/activity-tracker';
import { sanitizeHtml } from '@/lib/sanitize';

export default function LessonViewerPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lesson, setLesson] = React.useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseLessons, setCourseLessons] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = React.useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [course, setCourse] = React.useState<any>(null);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [aiTutorEnabled, setAiTutorEnabled] = React.useState(false);
  const [lessonProgressMap, setLessonProgressMap] = React.useState<Record<string, boolean>>({});
  const [aiTutorPreferences, setAiTutorPreferences] = React.useState<any>(null);
  const [scormPackage, setScormPackage] = React.useState<any>(null);

  React.useEffect(()=>{ (async ()=>{
    const [lRes, profRes, courseRes, aiTutorRes, scormRes] = await Promise.all([
      fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' }),
      fetch('/api/auth/profile', { cache: 'no-store' }),
      fetch(`/api/courses/${courseId}`, { cache: 'no-store' }),
      fetch('/api/ai/tutor/preferences', { cache: 'no-store' }),
      fetch(`/api/scorm/package/${lessonId}`, { cache: 'no-store' })
    ]);
    
    // Check if lesson fetch was successful
    if (!lRes.ok) {
      const errorData = await lRes.json();
      console.error('Lesson fetch error:', errorData);
      setLesson({ error: errorData.error || 'Lesson not found' });
    } else {
      const lData = await lRes.json();
      setLesson(lData);
      
      // Log lesson view activity
      if (courseId && lessonId && lData?.id) {
        logLessonView(courseId as string, lessonId, lData.title).catch(err => {
          console.error('Failed to log lesson view:', err);
        });
      }
    }
    
    const pData = profRes.ok ? await profRes.json() : null;
    setProfile(pData);
    const cData = courseRes.ok ? await courseRes.json() : null;
    setCourse(cData);
    const aiTutorData = aiTutorRes.ok ? await aiTutorRes.json() : null;
    if (aiTutorData?.preferences) {
      setAiTutorPreferences(aiTutorData.preferences);
      setAiTutorEnabled(aiTutorData.preferences.isEnabled);
    }
    
    // Load SCORM package if available
    if (scormRes.ok) {
      const scormData = await scormRes.json();
      setScormPackage(scormData.scormPackage);
    }
  })(); }, [lessonId, courseId]);

  React.useEffect(()=>{ (async ()=>{
    if (!courseId) return;
    const res = await fetch(`/api/lessons?course_id=${courseId}`, { cache: 'no-store' });
    const data = await res.json();
    const lessons = Array.isArray(data.lessons)? data.lessons: [];
    // Ensure lessons are sorted by order field
    const sortedLessons = lessons.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    setCourseLessons(sortedLessons);
  })(); }, [courseId]);

  // Fetch course progress for sidebar completion indicators
  React.useEffect(() => {
    const fetchCourseProgress = async () => {
      if (!profile?.id || !courseId) return;
      try {
        const res = await fetch(`/api/progress/${profile.id}/course/${courseId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const progressMap: Record<string, boolean> = {};
          (data.lessons || []).forEach((lesson: { lesson_id: string; completed: boolean }) => {
            progressMap[lesson.lesson_id] = lesson.completed;
          });
          setLessonProgressMap(progressMap);
          // Check if current lesson is already completed
          if (progressMap[lessonId]) {
            setIsCompleted(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch course progress:', error);
      }
    };
    fetchCourseProgress();
  }, [profile?.id, courseId, lessonId]);

  const markComplete = async () => {
    if (!profile?.id || isCompleting) return;
    setIsCompleting(true);
    try {
      await fetch(`/api/progress/${profile.id}/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', progress_percentage: 100 })
      });
      setIsCompleted(true);
      // Update the progress map for sidebar indicator
      setLessonProgressMap(prev => ({ ...prev, [lessonId]: true }));
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      alert('Failed to mark lesson as complete');
    } finally {
      setIsCompleting(false);
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oecs-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Handle lesson errors (e.g., unpublished lessons for students)
  if (lesson.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson Not Available</h2>
          <p className="text-gray-600 mb-8">{lesson.error}</p>
          <Link
            href={`/course/${courseId}`}
            className="inline-flex items-center px-6 py-3 bg-oecs-red hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
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

  const idx = courseLessons.findIndex((l)=> l.id === lessonId);
  const prevId = idx>0 ? courseLessons[idx-1]?.id : null;
  const nextId = idx>=0 && idx < courseLessons.length-1 ? courseLessons[idx+1]?.id : null;
  const completedCount = courseLessons.filter((l) => lessonProgressMap[l.id]).length;
  const progress = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50" style={{ scrollBehavior: 'smooth' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href={`/course/${courseId}`}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back to Course</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900 line-clamp-1">{course?.title || 'Course'}</h1>
                <p className="text-xs sm:text-sm text-gray-500">Lesson {idx + 1} of {courseLessons.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-500">
                {Math.round(progress)}% Complete
              </div>
              <div className="flex-1 sm:w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-oecs-red h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
            { label: lesson?.title || 'Lesson' },
          ]}
          className="mb-6"
        />

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Lesson Header */}
              <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{lesson.title}</h1>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <Link 
                          href={`/course/${courseId}/lesson/${lessonId}/discussions`}
                          className="inline-flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-oecs-lime-green bg-white border border-oecs-lime-green rounded-md hover:bg-oecs-lime-green hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oecs-lime-green transition-colors"
                        >
                          <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="hidden sm:inline">Discussions</span>
                        </Link>
                        <RoleGuard roles={["instructor", "curriculum_designer", "admin", "super_admin"]}>
                          <Link 
                            href={`/lessons/${lessonId}/edit`}
                            className="inline-flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-oecs-lime-green"
                          >
                            <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Link>
                        </RoleGuard>
                      </div>
                    </div>
                    {lesson.description && (
                      <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">{lesson.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
                      {lesson.estimated_time && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {lesson.estimated_time} min
                        </div>
                      )}
                      {lesson.difficulty && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Level {lesson.difficulty}/5
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Conferences */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
                <VideoConferenceSection 
                  courseId={courseId} 
                  lessonId={lessonId} 
                  isInstructor={profile?.role && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role)}
                />
              </div>

              {/* Learning Outcomes */}
              {Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0 && (
                <div className="px-4 sm:px-6 py-4 sm:py-6 bg-blue-50 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Learning Outcomes
                  </h3>
                  <ul className="space-y-2">
                    {lesson.learning_outcomes.map((outcome: string, i: number) => (
                      <li key={i} className="flex items-start text-sm sm:text-base text-gray-700">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="break-words">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {lesson.lesson_instructions && (
                <div className="px-4 sm:px-6 py-4 sm:py-6 bg-yellow-50 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instructions
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700 rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                </div>
              )}

              {/* Lesson Content */}
              <div className="px-4 sm:px-6 py-6 sm:py-8 min-h-[200px]">
                {lesson.content_type === 'scorm' && scormPackage ? (
                  <SCORMPlayer
                    packageUrl={scormPackage.package_url}
                    scormPackageId={scormPackage.id}
                    scormVersion={scormPackage.scorm_version}
                    courseId={courseId}
                    lessonId={lessonId}
                    title={scormPackage.title || lesson.title}
                  />
                ) : (
                  <LessonViewer
                    content={lesson.content || []}
                    lessonId={lessonId}
                    courseId={courseId}
                    lessonTitle={lesson.title}
                    isInstructor={profile?.role && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role)}
                    onContentUpdate={() => {
                      // Refresh the lesson data when content is updated
                      fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' })
                        .then(res => res.json())
                        .then(data => setLesson(data))
                        .catch(console.error);
                    }}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Previous Lesson */}
                  <button
                    onClick={() => prevId && router.push(`/course/${courseId}/lesson/${prevId}`)}
                    disabled={!prevId}
                    className="group flex items-center justify-center px-4 sm:px-6 py-3 sm:py-3.5 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-blue-500 disabled:border-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-xl font-medium text-gray-700 hover:text-blue-700 disabled:text-gray-400 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
                  >
                    {prevId ? (
                      <>
                        <svg className="w-5 h-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Previous Lesson</span>
                        <span className="sm:hidden">Previous</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2 sm:mr-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden sm:inline">First Lesson</span>
                        <span className="sm:hidden">First</span>
                      </>
                    )}
                  </button>
                  
                  {/* Complete Button */}
                  <div className="flex items-center justify-center">
                    {!isCompleted && (
                      <button 
                        onClick={markComplete}
                        disabled={isCompleting}
                        className="group relative overflow-hidden flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                        {isCompleting ? (
                          <span className="relative flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                            <span className="hidden sm:inline">Processing...</span>
                            <span className="sm:hidden">Processing...</span>
                          </span>
                        ) : (
                          <span className="relative flex items-center">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">Mark as Complete</span>
                            <span className="sm:hidden">Complete</span>
                          </span>
                        )}
                      </button>
                    )}
                    {isCompleted && (
                      <div className="flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 rounded-xl font-semibold text-base sm:text-lg shadow-sm">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden sm:inline">Lesson Completed</span>
                        <span className="sm:hidden">Completed</span>
                      </div>
                    )}
                  </div>

                  {/* Next Lesson */}
                  <button
                    onClick={() => nextId && router.push(`/course/${courseId}/lesson/${nextId}`)}
                    disabled={!nextId}
                    className="group flex items-center justify-center px-4 sm:px-6 py-3 sm:py-3.5 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-blue-500 disabled:border-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-xl font-medium text-gray-700 hover:text-blue-700 disabled:text-gray-400 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
                  >
                    {nextId ? (
                      <>
                        <span className="hidden sm:inline">Next Lesson</span>
                        <span className="sm:hidden">Next</span>
                        <svg className="w-5 h-5 ml-2 sm:ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Last Lesson</span>
                        <span className="sm:hidden">End</span>
                        <svg className="w-5 h-5 ml-2 sm:ml-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="mt-6 sm:mt-8 lg:mt-0">
            <div className="space-y-4 sm:space-y-6">
              {/* Course Progress */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Course Progress
                  </h3>
                </div>
                <div className="p-4 sm:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {courseLessons.map((l, index) => {
                    const isLessonCompleted = lessonProgressMap[l.id] || false;
                    const isCurrent = l.id === lessonId;

                    return (
                      <div
                        key={l.id}
                        className={`group flex items-center p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                          isCurrent
                            ? 'bg-gradient-to-r from-oecs-red to-red-600 text-white shadow-lg'
                            : isLessonCompleted
                              ? 'bg-green-50 hover:bg-green-100 text-gray-900 border border-green-200'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-transparent hover:border-gray-300'
                        }`}
                        onClick={() => router.push(`/course/${courseId}/lesson/${l.id}`)}
                      >
                        <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 transition-all duration-200 ${
                          isCurrent
                            ? 'bg-white bg-opacity-25 text-white shadow-md'
                            : isLessonCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-white text-gray-700 group-hover:bg-gray-200 shadow-sm'
                        }`}>
                          {isLessonCompleted && !isCurrent ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm sm:text-base font-semibold truncate ${
                            isCurrent ? 'text-white' : 'text-gray-900'
                          }`}>{l.title}</p>
                          <p className={`text-xs sm:text-sm truncate mt-0.5 ${
                            isCurrent ? 'text-white opacity-80' : isLessonCompleted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {isLessonCompleted && !isCurrent ? 'Completed' : (l.description || 'No description')}
                          </p>
                        </div>
                        {isCurrent && (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-2 flex-shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>


              {/* Lesson Discussions */}
              <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />

              {/* Session Recordings */}
              <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />

              {/* Resource Links */}
              <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} />

              {/* Gradebook Section */}
              <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-500 px-6 py-4">
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Gradebook
                    </h3>
                    <p className="text-sm text-purple-100 mt-1">Manage student grades and assessments</p>
                  </div>
                  <div className="p-6">
                  <div className="space-y-2">
                    <Link 
                      href={`/courses/${courseId}/gradebook`}
                      className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      View Gradebook
                    </Link>
                    <Link 
                      href={`/courses/${courseId}/gradebook/setup`}
                      className="block w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Setup Gradebook
                    </Link>
                  </div>
                  </div>
                </div>
              </RoleGuard>

            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Widget */}
      <AITutorWidget
        lessonId={lessonId}
        courseId={courseId}
        isEnabled={aiTutorEnabled}
        onToggle={() => setAiTutorEnabled(!aiTutorEnabled)}
      />
    </div>
  );
}