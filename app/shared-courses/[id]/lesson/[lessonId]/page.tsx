'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import LessonViewer from '@/app/components/lesson/LessonViewer';
import VideoPlayer from '@/app/components/media/VideoPlayer';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import VideoDiscussionThread from '@/app/components/media/VideoDiscussionThread';
import SCORMPlayer from '@/app/components/media/SCORMPlayer';
import RichTextPlayer from '@/app/components/editor/RichTextPlayer';
import AITutorWidget from '@/app/components/ai/AITutorWidget';
import AITutorPanel from '@/app/components/ai/AITutorPanel';
import LessonDiscussionsSidebar from '@/app/components/discussions/LessonDiscussionsSidebar';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
import { sanitizeHtml } from '@/lib/sanitize';

/**
 * Shared Course Lesson Page
 * Uses the same layout branches as the origin lesson viewer
 * (video 3-col, SCORM immersive, RichText immersive, fallback)
 * but fetches via the cross-tenant shared course API.
 */
export default function SharedCourseLessonPage() {
  const { id: shareId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();

  const [lesson, setLesson] = React.useState<any>(null);
  const [courseLessons, setCourseLessons] = React.useState<any[]>([]);
  const [courseData, setCourseData] = React.useState<any>(null);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [showNextLessonPrompt, setShowNextLessonPrompt] = React.useState(false);
  const [lessonProgressMap, setLessonProgressMap] = React.useState<Record<string, boolean>>({});
  const [scormPackage, setScormPackage] = React.useState<any>(null);
  const [outcomesOpen, setOutcomesOpen] = React.useState(false);
  const [instructionsOpen, setInstructionsOpen] = React.useState(false);
  const [videoTab, setVideoTab] = React.useState<string | null>('outcomes');
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0);
  const videoSeekRef = React.useRef<((time: number) => void) | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [aiTutorEnabled, setAiTutorEnabled] = React.useState(true);

  // ─── Data fetching ────────────────────────────────────────────────────────

  React.useEffect(() => { (async () => {
    try {
      const [lessonRes, courseRes, scormRes] = await Promise.allSettled([
        fetch(`/api/shared-courses/${shareId}/lessons?lesson_id=${lessonId}`),
        fetch(`/api/shared-courses/${shareId}`),
        fetch(`/api/scorm/package/${lessonId}`),
      ]);

      // Process lesson
      if (lessonRes.status === 'fulfilled') {
        if (!lessonRes.value.ok) {
          const errData = await lessonRes.value.json().catch(() => ({}));
          setError(errData.error || 'Lesson not found');
          setLesson({ error: errData.error || 'Lesson not found' });
          return;
        }
        const data = await lessonRes.value.json();
        setLesson(data.lesson);
      }

      // Process course data
      if (courseRes.status === 'fulfilled' && courseRes.value.ok) {
        const data = await courseRes.value.json();
        setCourseData(data);

        const published = (data.lessons || [])
          .filter((l: any) => l.published)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setCourseLessons(published);

        const progressMap: Record<string, boolean> = {};
        for (const l of (data.lessons || [])) {
          progressMap[l.id] = l.completed || false;
        }
        setLessonProgressMap(progressMap);
        if (progressMap[lessonId]) setIsCompleted(true);
      }

      // Process SCORM
      if (scormRes.status === 'fulfilled' && scormRes.value.ok) {
        const data = await scormRes.value.json();
        setScormPackage(data.scormPackage);
      }
    } catch (err) {
      console.error('Error loading shared lesson:', err);
      setError('Network error loading lesson.');
    }
  })(); }, [shareId, lessonId]);

  // ─── Mark complete ──────────────────────────────────────────────────────────

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
        setTimeout(() => setShowNextLessonPrompt(true), 600);
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-slate-200 border-t-slate-600 mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (lesson.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-8 text-center">
          <Icon icon="mdi:alert-circle" className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Lesson Not Available</h2>
          <p className="text-sm text-gray-600 mb-4">{lesson.error}</p>
          <Link href={`/shared-courses/${shareId}`} className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-md transition-colors text-sm">
            ← Back to Course
          </Link>
        </div>
      </div>
    );
  }

  // ─── Navigation helpers ──────────────────────────────────────────────────────

  const course = courseData?.course;
  const idx = courseLessons.findIndex(l => l.id === lessonId);
  const prevId = idx > 0 ? courseLessons[idx - 1]?.id : null;
  const nextId = idx >= 0 && idx < courseLessons.length - 1 ? courseLessons[idx + 1]?.id : null;
  const nextLesson = nextId ? courseLessons[idx + 1] : null;
  const completedCount = courseLessons.filter(l => lessonProgressMap[l.id]).length;
  const progress = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  const isCourseComplete = completedCount === courseLessons.length && courseLessons.length > 0;

  const navigateLesson = (id: string) => router.push(`/shared-courses/${shareId}/lesson/${id}`);

  // ─── Next Lesson Prompt (shared across all layouts) ──────────────────────────

  const NextLessonPrompt = showNextLessonPrompt && isCompleted ? (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200/80 overflow-hidden">
          {isCourseComplete ? (
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50">
                <Icon icon="mdi:trophy" className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Course Complete!</p>
                <p className="text-xs text-gray-500">You&apos;ve finished all {courseLessons.length} lessons</p>
              </div>
              <Link href={`/shared-courses/${shareId}`} className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex-shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }}>
                View Course
              </Link>
              <button onClick={() => setShowNextLessonPrompt(false)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          ) : nextLesson ? (
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)' }}>
                <Icon icon="mdi:check-circle" className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 font-medium">Lesson Complete</p>
                <p className="text-sm font-semibold text-gray-900 truncate">Up next: {nextLesson.title}</p>
                <p className="text-xs text-gray-400">{completedCount}/{courseLessons.length} lessons done</p>
              </div>
              <Link
                href={`/shared-courses/${shareId}/lesson/${nextId}`}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 flex items-center gap-2 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
              >
                Continue <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
              <button onClick={() => setShowNextLessonPrompt(false)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <div className="h-1 bg-gray-100">
            <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: isCourseComplete ? '#10B981' : 'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))' }} />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ─── Content type detection (same logic as origin) ──────────────────────────

  const isVideoLesson = lesson.content_type === 'video' ||
    (lesson.content?.length > 0 && lesson.content[0]?.type === 'video' && lesson.content_type !== 'rich_text');
  const videoBlock = isVideoLesson ? lesson.content?.[0] : null;

  // ─── VIDEO LESSON: 3-column immersive layout ──────────────────────────────

  if (isVideoLesson && videoBlock) {
    const vChapters = videoBlock.data?.chapters || [];
    const hasChapters = vChapters.length > 0;
    const vtabs: { id: string; label: string; icon: string }[] = [
      ...(Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0
        ? [{ id: 'outcomes', label: 'Learning Outcomes', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }] : []),
      ...(lesson.lesson_instructions
        ? [{ id: 'instructions', label: 'Instructions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }] : []),
      { id: 'overview', label: 'Overview', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { id: 'notes', label: 'Notes & Questions', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
      { id: 'discussions', label: 'Discussions', icon: 'M20 12c0 1.363-.469 2.621-1.256 3.613-.236.297-.462.564-.676.808C17.012 17.547 12 20 12 20s-5.012-2.453-6.068-3.579a10.06 10.06 0 01-.676-.808A5.961 5.961 0 014 12c0-3.314 2.686-6 6-6a5.96 5.96 0 012 .344A5.96 5.96 0 0114 6c3.314 0 6 2.686 6 6z' },
      { id: 'resources', label: 'Resources', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
      { id: 'ai-tutor', label: 'AI Tutor', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
    ];

    const currentChapterIdx = vChapters.reduce((acc: number, ch: any, i: number) => (videoCurrentTime >= ch.time ? i : acc), 0);
    const handleVideoTabClick = (key: string) => { setVideoTab((prev: string | null) => prev === key ? null : key); };
    const fmtTs = (s: number) => { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };
    const courseId = course?.id || '';

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        {/* Top nav bar */}
        <div className="h-12 flex items-center justify-between px-2 sm:px-4 bg-gray-900 shrink-0 z-50" style={{ position: 'sticky', top: 0 }}>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 mr-2">
            <Link href={`/shared-courses/${shareId}`} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline truncate max-w-[180px]">{course?.title || 'Course'}</span>
            </Link>
            <span className="text-gray-600 hidden sm:inline">/</span>
            <span className="text-white text-sm font-medium truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <span className="text-gray-400 text-sm tabular-nums">{progress}%</span>
            <button onClick={() => prevId && navigateLesson(prevId)} disabled={!prevId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => nextId && navigateLesson(nextId)} disabled={!nextId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {isCompleted ? (
              <span className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-gray-600 text-gray-400 cursor-default whitespace-nowrap">Completed</span>
            ) : (
              <button onClick={markComplete} disabled={isCompleting} className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:bg-gray-600 disabled:text-gray-400 whitespace-nowrap">
                {isCompleting ? 'Saving...' : 'Mark complete'}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="h-10 flex items-center bg-white border-b border-gray-200 shrink-0 z-40 overflow-x-auto" style={{ position: 'sticky', top: 48 }}>
          {vtabs.map(tab => (
            <button key={tab.id} onClick={() => handleVideoTabClick(tab.id)} className={`flex items-center gap-1.5 px-4 h-10 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${videoTab === tab.id ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} /></svg>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile tab content sheet */}
        {videoTab && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setVideoTab(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{vtabs.find(t => t.id === videoTab)?.label}</span>
                <button onClick={() => setVideoTab(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {videoTab !== 'ai-tutor' && (
                <div className="flex-1 overflow-y-auto">
                  {videoTab === 'outcomes' && Array.isArray(lesson.learning_outcomes) && (
                    <ol className="space-y-3 p-4">{lesson.learning_outcomes.map((text: string, i: number) => (<li key={i} className="flex items-start gap-3"><span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium mt-0.5">{i + 1}</span><span className="text-sm text-gray-700 leading-relaxed">{text}</span></li>))}</ol>
                  )}
                  {videoTab === 'instructions' && lesson.lesson_instructions && (
                    <div className="p-4"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="prose prose-sm max-w-none text-amber-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} /></div></div>
                  )}
                  {videoTab === 'overview' && (
                    <div className="p-4 space-y-4">
                      <h2 className="text-base font-bold text-gray-900">{lesson.title}</h2>
                      {(videoBlock.data?.description || lesson.description) && (<div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(videoBlock.data?.description || lesson.description || '') }} />)}
                    </div>
                  )}
                  {videoTab === 'notes' && (<VideoNotesPanel lessonId={lessonId} courseId={courseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />)}
                  {videoTab === 'discussions' && (<VideoDiscussionThread lessonId={lessonId} courseId={courseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />)}
                  {videoTab === 'resources' && (<div className="p-4 space-y-4"><ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} /><SessionRecordingsCard courseId={courseId} lessonId={lessonId} /></div>)}
                </div>
              )}
              {videoTab === 'ai-tutor' && (
                <div className="flex-1 overflow-hidden">
                  <AITutorPanel lessonId={lessonId} courseId={courseId} shareId={shareId} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Three-column video row */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chapters sidebar */}
          {hasChapters && (
            <div className="hidden lg:flex flex-col shrink-0 bg-gray-950 overflow-hidden w-[140px] xl:w-[168px]">
              <div className="flex border-b border-gray-800">
                <button onClick={() => setOutcomesOpen(false)} className={`flex-1 py-2 text-xs font-medium transition-colors ${!outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Chapters</button>
                <button onClick={() => setOutcomesOpen(true)} className={`flex-1 py-2 text-xs font-medium transition-colors ${outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Notes</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {!outcomesOpen ? (
                  <div>
                    <p className="text-[10px] uppercase text-gray-600 px-3 pt-3 pb-1 tracking-wider">Chapters ({vChapters.length})</p>
                    {vChapters.map((ch: any, i: number) => (
                      <button key={i} onClick={() => videoSeekRef.current?.(ch.time)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors border-l-2 ${i === currentChapterIdx ? 'text-white bg-gray-800 border-blue-500' : 'text-gray-400 hover:text-white hover:bg-gray-900 border-transparent'}`}>
                        <span className="text-gray-600 text-[10px] w-8 shrink-0 font-mono">{fmtTs(ch.time)}</span>
                        <span className="leading-snug flex-1">{ch.title}</span>
                        {i === currentChapterIdx && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2">
                    <p className="text-[10px] uppercase text-gray-600 px-1 pt-1 pb-2 tracking-wider">Timestamped Notes</p>
                    <p className="text-[10px] text-gray-600 px-1">Open the Notes tab to add notes.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video player */}
          <div className="flex-1 flex items-center bg-black overflow-hidden min-w-0">
            <div className="w-full">
              <VideoPlayer
                src={videoBlock.data?.url || videoBlock.data}
                title={videoBlock.data?.title || lesson.title}
                lessonId={lessonId}
                courseId={courseId}
                captions={videoBlock.data?.captions}
                audioDescriptionSrc={videoBlock.data?.audioDescriptionSrc}
                preventSkipping={videoBlock.data?.preventSkipping}
                onSeekRef={videoSeekRef}
                onTimeUpdate={(t) => setVideoCurrentTime(t)}
                onWatchProgress={(data) => setVideoCurrentTime(data.currentTime)}
              />
            </div>
          </div>

          {/* Tab content panel (desktop) */}
          <div className={`hidden lg:flex flex-col shrink-0 bg-white border-l border-gray-200 overflow-hidden transition-all duration-200 ${videoTab ? 'w-[320px] xl:w-[400px] 2xl:w-[490px]' : 'w-0'}`}>
            {videoTab && (
              <>
                <div className="h-10 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{vtabs.find(t => t.id === videoTab)?.label}</span>
                  <button onClick={() => setVideoTab(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close panel">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {videoTab !== 'ai-tutor' && (
                  <div className="flex-1 overflow-y-auto">
                    {videoTab === 'outcomes' && Array.isArray(lesson.learning_outcomes) && (
                      <ol className="space-y-3 p-4">{lesson.learning_outcomes.map((text: string, i: number) => (<li key={i} className="flex items-start gap-3"><span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium mt-0.5">{i + 1}</span><span className="text-sm text-gray-700 leading-relaxed">{text}</span></li>))}</ol>
                    )}
                    {videoTab === 'instructions' && lesson.lesson_instructions && (
                      <div className="p-4"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="prose prose-sm max-w-none text-amber-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} /></div></div>
                    )}
                    {videoTab === 'overview' && (
                      <div className="p-4 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">{lesson.title}</h2>
                        {(videoBlock.data?.description || lesson.description) && (<div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(videoBlock.data?.description || lesson.description || '') }} />)}
                      </div>
                    )}
                    {videoTab === 'notes' && (<VideoNotesPanel lessonId={lessonId} courseId={courseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />)}
                    {videoTab === 'discussions' && (<VideoDiscussionThread lessonId={lessonId} courseId={courseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />)}
                    {videoTab === 'resources' && (<div className="p-4 space-y-4"><ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} /><SessionRecordingsCard courseId={courseId} lessonId={lessonId} /></div>)}
                  </div>
                )}
                {videoTab === 'ai-tutor' && (
                  <div className="flex-1 overflow-hidden">
                    <AITutorPanel lessonId={lessonId} courseId={courseId} shareId={shareId} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {NextLessonPrompt}
      </div>
    );
  }

  // ─── RICH TEXT / DEFAULT LESSON → RichTextPlayer (immersive) ────────────────

  const isRichTextLesson = !lesson.content_type || lesson.content_type === 'rich_text' || lesson.content_type === 'text';
  const notVideoOrScorm = lesson.content_type !== 'video' && lesson.content_type !== 'scorm';

  if (lesson.content_type === 'scorm' && scormPackage) {
    // ─── SCORM LESSON → SCORMPlayer (immersive) ────────────────────────────────
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-40">
        <header className="flex items-center justify-between h-12 px-4 flex-shrink-0 border-b border-gray-200 bg-white z-20">
          <Link href={`/shared-courses/${shareId}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <Icon icon="mdi:chevron-left" className="w-4 h-4" />
            <span className="hidden sm:inline">{course?.title || 'Course'}</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="tabular-nums">{idx + 1} / {courseLessons.length}</span>
            <button onClick={() => prevId && navigateLesson(prevId)} disabled={!prevId} className="disabled:opacity-30"><Icon icon="mdi:chevron-left" className="w-4 h-4" /></button>
            <button onClick={() => nextId && navigateLesson(nextId)} disabled={!nextId} className="disabled:opacity-30"><Icon icon="mdi:chevron-right" className="w-4 h-4" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <SCORMPlayer
            packageUrl={scormPackage.package_url}
            scormPackageId={scormPackage.id}
            scormVersion={scormPackage.scorm_version}
            courseId={course?.id}
            lessonId={lessonId}
            shareId={shareId}
            title={scormPackage.title || lesson.title}
            lessonTitle={lesson.title}
            moduleTitle={course?.title}
            lessonDescription={lesson.description}
            learningOutcomes={lesson.learning_outcomes}
            instructions={lesson.lesson_instructions}
            lessonIndex={idx}
            totalLessons={courseLessons.length}
            onMarkComplete={markComplete}
            isCompleted={isCompleted}
          />
        </div>
        {NextLessonPrompt}
      </div>
    );
  }

  if (isRichTextLesson || (notVideoOrScorm && lesson.content?.length > 0)) {
    // ─── RICH TEXT LESSON → RichTextPlayer (immersive) ──────────────────────────
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-40">
        <RichTextPlayer
          courseId={course?.id || ''}
          lessonId={lessonId}
          shareId={shareId}
          lessonTitle={lesson.title}
          courseTitle={course?.title}
          lessonDescription={lesson.description}
          learningOutcomes={lesson.learning_outcomes}
          instructions={lesson.lesson_instructions}
          content={lesson.content || []}
          lessonIndex={idx}
          totalLessons={courseLessons.length}
          isCompleted={isCompleted}
          isCompleting={isCompleting}
          isInstructor={false}
          onMarkComplete={markComplete}
          onNavigate={navigateLesson}
          prevLessonId={prevId}
          nextLessonId={nextId}
          courseLessons={courseLessons}
          lessonProgressMap={lessonProgressMap}
        />
        {NextLessonPrompt}
      </div>
    );
  }

  // ─── FALLBACK LESSON LAYOUT ────────────────────────────────────────────────
  // Used when content type doesn't match video, SCORM, or rich text

  return (
    <div className="min-h-screen bg-gray-50/50" style={{ scrollBehavior: 'smooth' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <Link href={`/shared-courses/${shareId}`} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-4 w-px bg-gray-200" />
              <div className="min-w-0">
                <h1 className="text-sm font-medium text-slate-800 line-clamp-1">{course?.title || 'Course'}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <span className="text-xs text-slate-400 tabular-nums">{idx + 1} / {courseLessons.length}</span>
              <div className="w-24 sm:w-32 bg-gray-100 rounded-full h-1.5">
                <div className="bg-slate-700 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-400 tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-xl sm:text-2xl font-normal text-slate-900 break-words leading-tight tracking-tight mb-3">{lesson.title}</h1>
                {lesson.description && <p className="text-sm text-slate-500 mb-4 leading-relaxed">{lesson.description}</p>}
              </div>

              {/* Learning Outcomes */}
              {Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0 && (
                <div className="mx-5 sm:mx-8 my-5 sm:my-6 pl-4 border-l-2 border-slate-200">
                  <button onClick={() => setOutcomesOpen(!outcomesOpen)} className="flex items-center justify-between w-full text-left group">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Learning Outcomes <span className="ml-2 text-slate-300 normal-case tracking-normal">({lesson.learning_outcomes.length})</span></h3>
                    <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${outcomesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${outcomesOpen ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <ul className="space-y-2">
                      {lesson.learning_outcomes.map((outcome: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-slate-600 leading-relaxed">
                          <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0" />
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
                    <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${instructionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${instructionsOpen ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                  </div>
                </div>
              )}

              {/* Lesson Content */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 min-h-[200px]">
                {lesson.content && Array.isArray(lesson.content) && lesson.content.length > 0 ? (
                  <LessonViewer content={lesson.content} lessonId={lessonId} courseId={course?.id} lessonTitle={lesson.title} />
                ) : lesson.content && typeof lesson.content === 'string' ? (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }} />
                ) : (
                  <div className="text-center py-12 text-slate-400"><p className="text-sm">This lesson doesn&apos;t have content yet.</p></div>
                )}
              </div>

              {/* Navigation */}
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-t border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => prevId && navigateLesson(prevId)} disabled={!prevId} className="flex items-center text-sm text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <div className="flex items-center">
                    {!isCompleted && courseData?.enrollment ? (
                      <button onClick={markComplete} disabled={isCompleting} className="flex items-center px-5 py-2 border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:border-gray-300 disabled:text-gray-400 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed">
                        {isCompleting ? 'Processing...' : '✓ Mark Complete'}
                      </button>
                    ) : isCompleted ? (
                      <div className="flex items-center px-5 py-2 text-teal-600 text-sm font-medium">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 mr-1.5" /> Completed
                      </div>
                    ) : null}
                  </div>
                  <button onClick={() => nextId && navigateLesson(nextId)} disabled={!nextId} className="flex items-center text-sm text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors">
                    <span className="hidden sm:inline">Next</span>
                    <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="mt-6 sm:mt-8 lg:mt-0">
            <div className="space-y-5">
              {/* Course Progress */}
              <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Course Progress</h3>
                </div>
                <div className="p-3">
                  <div className="space-y-0.5">
                    {courseLessons.map((l, index) => {
                      const isLessonCompleted = lessonProgressMap[l.id] || false;
                      const isCurrent = l.id === lessonId;
                      return (
                        <div key={l.id} className={`flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isCurrent ? 'bg-slate-50 border-l-2 border-slate-700' : 'hover:bg-gray-50 border-l-2 border-transparent'}`} onClick={() => navigateLesson(l.id)}>
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 ${isCurrent ? 'bg-slate-700 text-white' : isLessonCompleted ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-slate-400'}`}>
                            {isLessonCompleted && !isCurrent ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            ) : index + 1}
                          </div>
                          <p className={`text-sm truncate ${isCurrent ? 'font-medium text-slate-800' : isLessonCompleted ? 'text-slate-500' : 'text-slate-600'}`}>{l.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <LessonDiscussionsSidebar courseId={course?.id} lessonId={lessonId} />
              <SessionRecordingsCard courseId={course?.id} lessonId={lessonId} />
              <ResourceLinksSidebar courseId={course?.id} lessonId={lessonId} />
            </div>
          </div>
        </div>
      </div>

      {NextLessonPrompt}

      <AITutorWidget
        lessonId={lessonId}
        courseId={course?.id}
        shareId={shareId}
        isEnabled={aiTutorEnabled}
        onToggle={() => setAiTutorEnabled(!aiTutorEnabled)}
      />
    </div>
  );
}
