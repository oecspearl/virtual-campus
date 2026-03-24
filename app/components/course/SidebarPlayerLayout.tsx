'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import LessonViewer from '@/app/components/LessonViewer';
import VideoPlayer from '@/app/components/VideoPlayer';
import VideoNotesPanel from '@/app/components/VideoNotesPanel';
import SCORMPlayer from '@/app/components/SCORMPlayer';
import AITutorWidget from '@/app/components/AITutorWidget';
import RoleGuard from '@/app/components/RoleGuard';
import { sanitizeHtml } from '@/lib/sanitize';
import { logLessonView } from '@/lib/activity-tracker';
import { getContentTypeIcon, formatDuration, isStaffRole } from './helpers';
import type { LessonData, SectionData, LessonProgressData } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarPlayerLayoutProps {
  courseId: string;
  courseTitle: string;
  lessons: LessonData[];
  sections: SectionData[];
  lessonProgress: LessonProgressData[];
  userRole: string | null;
  userId?: string | null;
  courseStartDate?: string | null;
  /** Called when user wants to exit player mode */
  onExitPlayer?: () => void;
}

interface LessonContent {
  id: string;
  title: string;
  content: any[];
  lesson_instructions?: string;
  content_type?: string;
}

// ─── Content type icon helper ────────────────────────────────────────────────

const CONTENT_TYPE_COLORS: Record<string, string> = {
  video: 'text-red-500',
  audio: 'text-purple-500',
  document: 'text-blue-500',
  pdf: 'text-orange-500',
  scorm: 'text-indigo-500',
  quiz: 'text-amber-500',
  rich_text: 'text-gray-500',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SidebarPlayerLayout({
  courseId,
  courseTitle,
  lessons,
  sections,
  lessonProgress,
  userRole,
  userId,
  courseStartDate,
  onExitPlayer,
}: SidebarPlayerLayoutProps) {
  // State
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [scormPackage, setScormPackage] = useState<any>(null);
  const [aiTutorEnabled, setAiTutorEnabled] = useState(false);
  const [belowVideoTab, setBelowVideoTab] = useState<'overview' | 'notes'>('overview');
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const videoSeekRef = React.useRef<((time: number) => void) | null>(null);

  // Derived data
  const publishedLessons = useMemo(
    () => lessons.filter(l => l.published).sort((a, b) => a.order - b.order),
    [lessons]
  );

  const progressMap = useMemo(() => {
    const map: Record<string, LessonProgressData> = {};
    lessonProgress.forEach(lp => { map[lp.lesson_id] = lp; });
    return map;
  }, [lessonProgress]);

  const completedCount = useMemo(
    () => lessonProgress.filter(lp => lp.status === 'completed').length,
    [lessonProgress]
  );

  const totalCount = publishedLessons.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group lessons by section
  const sectionedLessons = useMemo(() => {
    if (sections.length === 0) {
      return [{ section: null, lessons: publishedLessons }];
    }

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const groups: { section: SectionData | null; lessons: LessonData[] }[] = [];

    // Unsectioned lessons first
    const unsectioned = publishedLessons.filter(l => !l.section_id);
    if (unsectioned.length > 0) {
      groups.push({ section: null, lessons: unsectioned });
    }

    // Then each section
    for (const sec of sortedSections) {
      const sectionLessons = publishedLessons.filter(l => l.section_id === sec.id);
      if (sectionLessons.length > 0) {
        groups.push({ section: sec, lessons: sectionLessons });
      }
    }

    return groups;
  }, [publishedLessons, sections]);

  // Current lesson navigation
  const activeLessonIndex = activeLessonId
    ? publishedLessons.findIndex(l => l.id === activeLessonId)
    : -1;
  const prevLesson = activeLessonIndex > 0 ? publishedLessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex < publishedLessons.length - 1 ? publishedLessons[activeLessonIndex + 1] : null;
  const activeLesson = activeLessonId ? publishedLessons.find(l => l.id === activeLessonId) : null;
  const isActiveCompleted = activeLessonId ? progressMap[activeLessonId]?.status === 'completed' : false;

  // Load lesson content
  const loadLesson = useCallback(async (lessonId: string) => {
    setActiveLessonId(lessonId);
    setLoading(true);
    setLessonContent(null);
    setScormPackage(null);
    setMobileSidebarOpen(false);

    try {
      const [lessonRes, scormRes] = await Promise.all([
        fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' }),
        fetch(`/api/scorm/package/${lessonId}`, { cache: 'no-store' }),
      ]);

      if (lessonRes.ok) {
        const data = await lessonRes.json();
        setLessonContent({
          id: data.id,
          title: data.title,
          content: data.content || [],
          lesson_instructions: data.lesson_instructions,
          content_type: data.content_type,
        });

        // Log lesson view
        logLessonView(courseId, lessonId, data.title).catch(() => {});
      }

      if (scormRes.ok) {
        const scormData = await scormRes.json();
        setScormPackage(scormData.scormPackage || null);
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Auto-load first incomplete lesson on mount
  useEffect(() => {
    if (publishedLessons.length > 0 && !activeLessonId) {
      const firstIncomplete = publishedLessons.find(
        l => progressMap[l.id]?.status !== 'completed'
      );
      loadLesson((firstIncomplete || publishedLessons[0]).id);
    }
  }, [publishedLessons, activeLessonId, progressMap, loadLesson]);

  // Load AI tutor preferences
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ai/tutor/preferences', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setAiTutorEnabled(data.preferences?.isEnabled || false);
        }
      } catch {}
    })();
  }, []);

  // Mark lesson complete
  const handleMarkComplete = async () => {
    if (!activeLessonId || !userId) return;
    setMarkingComplete(true);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: activeLessonId,
          course_id: courseId,
          status: 'completed',
        }),
      });
      if (res.ok) {
        // Auto-advance to next lesson after marking complete
        if (nextLesson) {
          setTimeout(() => loadLesson(nextLesson.id), 500);
        }
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    } finally {
      setMarkingComplete(false);
    }
  };

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 z-40">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: back + course title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onExitPlayer}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 flex-shrink-0"
              title="Back to course overview"
            >
              <Icon icon="material-symbols:arrow-back" className="w-5 h-5" />
              <span className="hidden md:inline">Course</span>
            </button>
            <div className="w-px h-6 bg-gray-300 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">{courseTitle}</span>
          </div>

          {/* Center: lesson info */}
          {activeLesson && (
            <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
              <span>Lesson {activeLessonIndex + 1} of {totalCount}</span>
              <span className="text-gray-300">|</span>
              <span className="truncate max-w-xs">{activeLesson.title}</span>
            </div>
          )}

          {/* Right: progress + sidebar toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-500">{completedCount}/{totalCount}</span>
              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{progressPercentage}%</span>
            </div>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Icon icon="material-symbols:menu" className="w-5 h-5" />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Icon
                icon={sidebarOpen ? 'material-symbols:left-panel-close' : 'material-symbols:left-panel-open'}
                className="w-5 h-5"
              />
            </button>

            {/* Gradebook link */}
            <Link
              href={`/courses/${courseId}/gradebook`}
              className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Icon icon="material-symbols:grade" className="w-4 h-4" />
              Grades
            </Link>
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="w-full bg-gray-100 h-0.5">
          <div
            className="bg-blue-600 h-0.5 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      {/* ── Main layout: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-64 xl:w-72' : 'w-0 overflow-hidden'}
            ${mobileSidebarOpen
              ? 'fixed left-0 top-14 bottom-0 w-72 z-40 shadow-xl'
              : 'hidden lg:block'
            }
          `}
        >
          <div className="p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Course Content</h3>

            {/* Section / lesson tree */}
            <nav className="space-y-1">
              {sectionedLessons.map((group, gi) => (
                <div key={group.section?.id || `unsectioned-${gi}`}>
                  {/* Section header (collapsible) */}
                  {group.section && (
                    <button
                      onClick={() => toggleSection(group.section!.id)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Icon
                        icon={collapsedSections.has(group.section!.id)
                          ? 'material-symbols:chevron-right'
                          : 'material-symbols:expand-more'}
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                      />
                      <span className="truncate">{group.section!.title}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {group.lessons.filter(l => progressMap[l.id]?.status === 'completed').length}/{group.lessons.length}
                      </span>
                    </button>
                  )}

                  {/* Lessons in this group */}
                  {(!group.section || !collapsedSections.has(group.section.id)) && (
                    <div className={group.section ? 'ml-2 border-l border-gray-100 pl-2' : ''}>
                      {group.lessons.map(lesson => {
                        const isActive = lesson.id === activeLessonId;
                        const progress = progressMap[lesson.id];
                        const isCompleted = progress?.status === 'completed';
                        const isInProgress = progress?.status === 'in_progress';

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => loadLesson(lesson.id)}
                            className={`
                              w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg transition-all
                              ${isActive
                                ? 'bg-blue-50 text-blue-900 font-medium border-l-2 border-blue-600 -ml-[2px]'
                                : 'text-gray-700 hover:bg-gray-50'
                              }
                            `}
                          >
                            {/* Status indicator */}
                            <div className={`
                              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]
                              ${isCompleted
                                ? 'bg-green-100 text-green-600'
                                : isActive
                                  ? 'bg-blue-100 text-blue-600'
                                  : isInProgress
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-gray-100 text-gray-400'
                              }
                            `}>
                              {isCompleted ? (
                                <Icon icon="material-symbols:check" className="w-3 h-3" />
                              ) : isActive ? (
                                <span className="w-2 h-2 bg-blue-600 rounded-full" />
                              ) : (
                                <Icon
                                  icon={getContentTypeIcon(lesson.content_type)}
                                  className="w-3 h-3"
                                />
                              )}
                            </div>

                            {/* Lesson title */}
                            <span className="truncate flex-1">{lesson.title}</span>

                            {/* Duration */}
                            {lesson.estimated_time > 0 && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {formatDuration(lesson.estimated_time * 60)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Progress footer */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Overall progress</span>
                <span>{completedCount} of {totalCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{progressPercentage}%</p>
            </div>
          </div>
        </aside>

        {/* ── Content Pane ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Lesson title bar */}
          {activeLesson && (
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 truncate">{activeLesson.title}</h1>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    {activeLesson.content_type && (
                      <span className="flex items-center gap-1 capitalize">
                        <Icon
                          icon={getContentTypeIcon(activeLesson.content_type)}
                          className={`w-3.5 h-3.5 ${CONTENT_TYPE_COLORS[activeLesson.content_type] || 'text-gray-400'}`}
                        />
                        {activeLesson.content_type.replace('_', ' ')}
                      </span>
                    )}
                    {activeLesson.estimated_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon icon="material-symbols:timer" className="w-3.5 h-3.5" />
                        Est. {formatDuration(activeLesson.estimated_time * 60)}
                      </span>
                    )}
                    <span>Lesson {activeLessonIndex + 1} of {totalCount}</span>
                  </div>
                </div>

                {/* Edit lesson link for staff */}
                <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                  <Link
                    href={`/lessons/${activeLessonId}/edit`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Icon icon="material-symbols:edit" className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                </RoleGuard>
              </div>
            </div>
          )}

          {/* SCORM: fill remaining space without scroll wrapper */}
          {!loading && lessonContent && scormPackage && (
            <div className="flex-1 overflow-hidden">
              <SCORMPlayer
                packageUrl={scormPackage.package_url}
                scormPackageId={scormPackage.id}
                scormVersion={scormPackage.scorm_version}
                courseId={courseId}
                lessonId={activeLessonId!}
                lessonTitle={lessonContent?.title}
                moduleTitle={courseTitle}
                learningOutcomes={lessonContent?.content?.[0]?.data?.learning_outcomes}
                instructions={lessonContent?.lesson_instructions}
              />
            </div>
          )}

          {/* Scrollable lesson content (non-SCORM) */}
          {!(lessonContent && scormPackage) && (
          <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Loading lesson...</p>
                  </div>
                </div>
              ) : !lessonContent ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Icon icon="material-symbols:play-lesson" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-1">Select a lesson</h3>
                    <p className="text-sm text-gray-400">Choose a lesson from the sidebar to begin</p>
                  </div>
                </div>
              ) : (() => {
                // Check if this is a video-primary lesson
                const isVideoLesson = lessonContent.content_type === 'video' ||
                  (lessonContent.content?.length > 0 && lessonContent.content[0]?.type === 'video');
                const videoBlock = isVideoLesson ? lessonContent.content?.[0] : null;

                if (isVideoLesson && videoBlock) {
                  // ─── Video-first layout (Tutor LMS style) ─────────
                  return (
                    <div className="flex flex-col">
                      {/* Video: edge-to-edge */}
                      <div className="bg-black w-full">
                        <div className="max-w-5xl mx-auto">
                          <VideoPlayer
                            src={videoBlock.data?.url || videoBlock.data}
                            title={videoBlock.data?.title || lessonContent.title}
                            lessonId={activeLessonId!}
                            courseId={courseId}
                            chapters={videoBlock.data?.chapters}
                            captions={videoBlock.data?.captions}
                            audioDescriptionSrc={videoBlock.data?.audioDescriptionSrc}
                            preventSkipping={videoBlock.data?.preventSkipping}
                            onWatchProgress={(data) => {
                              setVideoCurrentTime(data.currentTime);
                            }}
                          />
                        </div>
                      </div>

                      {/* Tabs below video */}
                      <div className="border-b border-gray-200 bg-white">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6">
                          <nav className="flex gap-0" aria-label="Tabs">
                            <button
                              onClick={() => setBelowVideoTab('overview')}
                              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                belowVideoTab === 'overview'
                                  ? 'border-blue-600 text-blue-700'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <Icon icon="material-symbols:info-outline" className="w-4 h-4" />
                              Overview
                            </button>
                            <button
                              onClick={() => setBelowVideoTab('notes')}
                              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                belowVideoTab === 'notes'
                                  ? 'border-blue-600 text-blue-700'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <Icon icon="material-symbols:sticky-note-2-outline" className="w-4 h-4" />
                              Notes & Questions
                            </button>
                          </nav>
                        </div>
                      </div>

                      {/* Tab content */}
                      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                        {belowVideoTab === 'overview' ? (
                          <div className="space-y-6">
                            {/* Video description */}
                            {videoBlock.data?.description && (
                              <div className="prose prose-sm max-w-none text-gray-700 rich-text-content"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(videoBlock.data.description) }}
                              />
                            )}

                            {/* Lesson instructions */}
                            {lessonContent.lesson_instructions && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-5">
                                <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                  <Icon icon="material-symbols:info" className="w-4 h-4" />
                                  Instructions
                                </h3>
                                <div
                                  className="prose prose-sm max-w-none text-gray-700 rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(lessonContent.lesson_instructions) }}
                                />
                              </div>
                            )}

                            {/* Remaining content blocks (if any beyond the video) */}
                            {lessonContent.content.length > 1 && (
                              <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                                <div className="p-4 sm:p-6 lg:p-8">
                                  <LessonViewer
                                    content={lessonContent.content.slice(1)}
                                    lessonId={activeLessonId!}
                                    courseId={courseId}
                                    lessonTitle={lessonContent.title}
                                    isInstructor={isStaffRole(userRole)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* AI Tutor Widget */}
                            {activeLessonId && (
                              <AITutorWidget
                                lessonId={activeLessonId}
                                courseId={courseId}
                                isEnabled={aiTutorEnabled}
                                onToggle={() => setAiTutorEnabled(!aiTutorEnabled)}
                              />
                            )}
                          </div>
                        ) : (
                          /* Notes tab */
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '400px' }}>
                            <VideoNotesPanel
                              lessonId={activeLessonId!}
                              courseId={courseId}
                              currentTime={videoCurrentTime}
                              onSeek={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // ─── Standard lesson layout (non-video) ────────────
                return (
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="space-y-6">
                      {lessonContent.lesson_instructions && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-5">
                          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                            <Icon icon="material-symbols:info" className="w-4 h-4" />
                            Instructions
                          </h3>
                          <div
                            className="prose prose-sm max-w-none text-gray-700 rich-text-content"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(lessonContent.lesson_instructions) }}
                          />
                        </div>
                      )}

                      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                        <div className="p-4 sm:p-6 lg:p-8">
                          <LessonViewer
                            content={lessonContent.content}
                            lessonId={activeLessonId!}
                            courseId={courseId}
                            lessonTitle={lessonContent.title}
                            isInstructor={isStaffRole(userRole)}
                          />
                        </div>
                      </div>

                      {activeLessonId && (
                        <AITutorWidget
                          lessonId={activeLessonId}
                          courseId={courseId}
                          isEnabled={aiTutorEnabled}
                          onToggle={() => setAiTutorEnabled(!aiTutorEnabled)}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
          )}

          {/* ── Footer Nav (hidden for SCORM — it has its own bottom bar) ── */}
          {activeLesson && !scormPackage && (
            <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {/* Prev */}
                <div className="w-1/3">
                  {prevLesson ? (
                    <button
                      onClick={() => loadLesson(prevLesson.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Icon icon="material-symbols:chevron-left" className="w-5 h-5" />
                      <span className="hidden sm:inline truncate max-w-[160px]">{prevLesson.title}</span>
                      <span className="sm:hidden">Previous</span>
                    </button>
                  ) : <div />}
                </div>

                {/* Center: mark complete */}
                <div className="flex items-center gap-3">
                  {isActiveCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg">
                      <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
                      Completed
                    </span>
                  ) : userId ? (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors"
                    >
                      <Icon icon="material-symbols:check-circle" className="w-4 h-4" />
                      {markingComplete ? 'Saving...' : 'Mark Complete'}
                    </button>
                  ) : null}
                </div>

                {/* Next */}
                <div className="w-1/3 flex justify-end">
                  {nextLesson ? (
                    <button
                      onClick={() => loadLesson(nextLesson.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <span className="hidden sm:inline truncate max-w-[160px]">{nextLesson.title}</span>
                      <span className="sm:hidden">Next</span>
                      <Icon icon="material-symbols:chevron-right" className="w-5 h-5" />
                    </button>
                  ) : <div />}
                </div>
              </div>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
