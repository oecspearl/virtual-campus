'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import LessonViewer from '@/app/components/lesson/LessonViewer';
import VideoPlayer from '@/app/components/media/VideoPlayer';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import VideoDiscussionThread from '@/app/components/media/VideoDiscussionThread';
import SCORMPlayer from '@/app/components/media/SCORMPlayer';
import Button from '@/app/components/ui/Button';
import Link from 'next/link';
import RoleGuard from '@/app/components/RoleGuard';
import LessonDiscussionsSidebar from '@/app/components/discussions/LessonDiscussionsSidebar';
import VideoConferenceSection from '@/app/components/conference/VideoConferenceSection';
import AITutorWidget from '@/app/components/ai/AITutorWidget';
import AITutorPanel from '@/app/components/ai/AITutorPanel';
import RichTextPlayer from '@/app/components/editor/RichTextPlayer';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import Breadcrumb from '@/app/components/ui/Breadcrumb';
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
  const [outcomesOpen, setOutcomesOpen] = React.useState(false);
  const [instructionsOpen, setInstructionsOpen] = React.useState(false);
  const [videoTab, setVideoTab] = React.useState<string | null>('outcomes');
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0);
  const videoSeekRef = React.useRef<((time: number) => void) | null>(null);
  const [editMode, setEditMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lesson-edit-mode') !== 'off';
    }
    return true;
  });

  const toggleEditMode = () => {
    setEditMode(prev => {
      const next = !prev;
      localStorage.setItem('lesson-edit-mode', next ? 'on' : 'off');
      return next;
    });
  };

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
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-slate-200 border-t-slate-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Handle lesson errors (e.g., unpublished lessons for students)
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
          <p className="text-gray-600 mb-8">{lesson.error}</p>
          <Link
            href={`/course/${courseId}`}
            className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-md transition-colors "
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
  const isInstructorRole = profile?.role && ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role);

  // Detect video-only lesson
  const isVideoLesson = lesson.content_type === 'video' ||
    (lesson.content?.length > 0 && lesson.content[0]?.type === 'video' && lesson.content_type !== 'rich_text');
  const videoBlock = isVideoLesson ? lesson.content?.[0] : null;

  // ─── VIDEO LESSON: 3-column layout per spec ─────────────────────────────────
  if (isVideoLesson && videoBlock) {
    const vChapters = videoBlock.data?.chapters || [];
    const hasChapters = vChapters.length > 0;
    const [chapterSubTab, setChapterSubTab] = [outcomesOpen ? 'notes' : 'chapters', setOutcomesOpen]; // reuse unused state
    const vtabs: { id: string; label: string; icon: string }[] = [
      ...(Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0
        ? [{ id: 'outcomes', label: 'Learning Outcomes', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }] : []),
      ...(lesson.lesson_instructions
        ? [{ id: 'instructions', label: 'Instructions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }] : []),
      { id: 'overview', label: 'Overview', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { id: 'notes', label: 'Notes & Questions', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
      { id: 'discussions', label: 'Discussions', icon: 'M20 12c0 1.363-.469 2.621-1.256 3.613-.236.297-.462.564-.676.808C17.012 17.547 12 20 12 20s-5.012-2.453-6.068-3.579a10.06 10.06 0 01-.676-.808A5.961 5.961 0 014 12c0-3.314 2.686-6 6-6a5.96 5.96 0 012 .344A5.96 5.96 0 0114 6c3.314 0 6 2.686 6 6z' },
      { id: 'resources', label: 'Resources', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
      { id: 'ai-tutor', label: 'AI Tutor', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z' },
    ];

    // Find current chapter
    const currentChapterIdx = vChapters.reduce((acc: number, ch: any, i: number) => (videoCurrentTime >= ch.time ? i : acc), 0);

    const handleVideoTabClick = (key: string) => {
      setVideoTab((prev: string | null) => prev === key ? null : key);
    };

    const fmtTs = (s: number) => {
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white">

        {/* ══ ZONE A: Top nav bar ══ */}
        <div className="h-12 flex items-center justify-between px-4 bg-gray-900 shrink-0 z-50" style={{ position: 'sticky', top: 0 }}>
          <div className="flex items-center gap-2 min-w-0">
            <Link href={`/course/${courseId}`} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline truncate max-w-[180px]">{course?.title || 'Course'}</span>
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white text-sm font-medium truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm tabular-nums">{progress}%</span>
            <button onClick={() => router.refresh()} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            {/* Prev/Next */}
            <button onClick={() => prevId && router.push(`/course/${courseId}/lesson/${prevId}`)} disabled={!prevId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => nextId && router.push(`/course/${courseId}/lesson/${nextId}`)} disabled={!nextId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {isCompleted ? (
              <span className="px-4 py-1.5 rounded text-sm font-medium bg-gray-600 text-gray-400 cursor-default">Completed</span>
            ) : (
              <button onClick={markComplete} disabled={isCompleting} className="px-4 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:bg-gray-600 disabled:text-gray-400">
                {isCompleting ? 'Saving...' : 'Mark complete'}
              </button>
            )}
            {isInstructorRole && (
              <Link href={`/lessons/${lessonId}/edit`} className="text-gray-400 hover:text-white transition-colors" title="Edit lesson">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </Link>
            )}
          </div>
        </div>

        {/* ══ ZONE B: Tab bar ══ */}
        <div className="h-10 flex items-center bg-white border-b border-gray-200 shrink-0 z-40 overflow-x-auto" style={{ position: 'sticky', top: 48 }}>
          {vtabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleVideoTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-4 h-10 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                videoTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ ZONE C: Three-column video row ══ */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── C1: Chapters sidebar ── */}
          {hasChapters && (
            <div className="hidden lg:flex flex-col shrink-0 bg-gray-950 overflow-hidden" style={{ width: 168 }}>
              {/* Sub-tabs */}
              <div className="flex border-b border-gray-800">
                <button onClick={() => setChapterSubTab(false as any)} className={`flex-1 py-2 text-xs font-medium transition-colors ${!outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Chapters</button>
                <button onClick={() => setChapterSubTab(true as any)} className={`flex-1 py-2 text-xs font-medium transition-colors ${outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Notes</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {!outcomesOpen ? (
                  /* Chapters list */
                  <div>
                    <p className="text-[10px] uppercase text-gray-600 px-3 pt-3 pb-1 tracking-wider">Chapters ({vChapters.length})</p>
                    {vChapters.map((ch: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => videoSeekRef.current?.(ch.time)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors border-l-2 ${
                          i === currentChapterIdx
                            ? 'text-white bg-gray-800 border-blue-500'
                            : 'text-gray-400 hover:text-white hover:bg-gray-900 border-transparent'
                        }`}
                      >
                        <span className="text-gray-600 text-[10px] w-8 shrink-0 font-mono">{fmtTs(ch.time)}</span>
                        <span className="leading-snug flex-1">{ch.title}</span>
                        {i === currentChapterIdx && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Notes list (compact, no compose) */
                  <div className="p-2">
                    <p className="text-[10px] uppercase text-gray-600 px-1 pt-1 pb-2 tracking-wider">Timestamped Notes</p>
                    <p className="text-[10px] text-gray-600 px-1">Open the Notes tab to add notes. Click a timestamp to seek.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── C2: Video player ── */}
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

          {/* ── C3: Tab content panel ── */}
          <div className={`hidden lg:flex flex-col shrink-0 bg-white border-l border-gray-200 overflow-hidden transition-all duration-200 ${videoTab ? 'w-[490px]' : 'w-0'}`}>
            {videoTab && (
              <>
                {/* Panel header */}
                <div className="h-10 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{vtabs.find(t => t.id === videoTab)?.label}</span>
                  <button onClick={() => setVideoTab(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close panel">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Panel body — scrollable for most tabs */}
                {videoTab !== 'ai-tutor' && (
                <div className="flex-1 overflow-y-auto">
                  {/* Outcomes */}
                  {videoTab === 'outcomes' && Array.isArray(lesson.learning_outcomes) && (
                    <ol className="space-y-3 p-4">
                      {lesson.learning_outcomes.map((text: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium mt-0.5">{i + 1}</span>
                          <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* Instructions */}
                  {videoTab === 'instructions' && lesson.lesson_instructions && (
                    <div className="p-4">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="prose prose-sm max-w-none text-amber-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                      </div>
                    </div>
                  )}

                  {/* Overview */}
                  {videoTab === 'overview' && (
                    <div className="p-4 space-y-4">
                      <h2 className="text-base font-bold text-gray-900">{lesson.title}</h2>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {lesson.estimated_time > 0 && <span>{lesson.estimated_time} min</span>}
                        {lesson.difficulty > 0 && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Level {lesson.difficulty}</span>}
                      </div>
                      {(videoBlock.data?.description || lesson.description) && (
                        <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(videoBlock.data?.description || lesson.description || '') }} />
                      )}
                    </div>
                  )}

                  {/* Notes & Questions */}
                  {videoTab === 'notes' && (
                    <VideoNotesPanel
                      lessonId={lessonId}
                      courseId={courseId}
                      currentTime={videoCurrentTime}
                      onSeek={(time) => videoSeekRef.current?.(time)}
                    />
                  )}

                  {/* Discussions */}
                  {videoTab === 'discussions' && (
                    <VideoDiscussionThread
                      lessonId={lessonId}
                      courseId={courseId}
                      currentTime={videoCurrentTime}
                      onSeek={(time) => videoSeekRef.current?.(time)}
                    />
                  )}

                  {/* Resources */}
                  {videoTab === 'resources' && (
                    <div className="p-4 space-y-4">
                      <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} collapsible={false} />
                      <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />
                    </div>
                  )}
                </div>
                )}

                {/* AI Tutor — fills panel, has its own scroll */}
                {videoTab === 'ai-tutor' && (
                  <div className="flex-1 overflow-hidden">
                    <AITutorPanel lessonId={lessonId} courseId={courseId} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    );
  }

  // ─── SCORM LESSON: Context drawer rail layout ───────────────────────────────
  if (lesson.content_type === 'scorm' && scormPackage) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-40">
        {/* Compact page header — just back link + lesson nav */}
        <header className="flex items-center justify-between h-12 px-4 flex-shrink-0 border-b border-gray-200 bg-white z-20">
          <Link
            href={`/course/${courseId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{course?.title || 'Back to course'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevId && router.push(`/course/${courseId}/lesson/${prevId}`)}
              disabled={!prevId}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => nextId && router.push(`/course/${courseId}/lesson/${nextId}`)}
              disabled={!nextId}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {isInstructorRole && (
              <Link href={`/lessons/${lessonId}/edit`} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="Edit lesson">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            )}
          </div>
        </header>

        {/* SCORM Player fills remaining space — it has its own top bar, context bar, right rail, bottom nav */}
        <div className="flex-1 overflow-hidden">
          <SCORMPlayer
            packageUrl={scormPackage.package_url}
            scormPackageId={scormPackage.id}
            scormVersion={scormPackage.scorm_version}
            courseId={courseId}
            lessonId={lessonId}
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
      </div>
    );
  }

  // ─── RICH TEXT LESSON: Immersive player layout ──────────────────────────────
  const isRichTextLesson = !lesson.content_type || lesson.content_type === 'rich_text' || lesson.content_type === 'text';
  const notVideoOrScorm = lesson.content_type !== 'video' && lesson.content_type !== 'scorm';

  if (isRichTextLesson || (notVideoOrScorm && lesson.content?.length > 0)) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-40">
        <RichTextPlayer
          courseId={courseId}
          lessonId={lessonId}
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
          isInstructor={!!isInstructorRole}
          onMarkComplete={markComplete}
          onNavigate={(id) => router.push(`/course/${courseId}/lesson/${id}`)}
          onContentUpdate={() => {
            fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' })
              .then(res => res.json())
              .then(data => setLesson(data))
              .catch(console.error);
          }}
          prevLessonId={prevId}
          nextLessonId={nextId}
          courseLessons={courseLessons}
          lessonProgressMap={lessonProgressMap}
        />
      </div>
    );
  }

  // ─── FALLBACK LESSON LAYOUT ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50" style={{ scrollBehavior: 'smooth' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <Link
                href={`/course/${courseId}`}
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
            { label: 'Courses', href: '/courses' },
            { label: course?.title || 'Course', href: `/course/${courseId}` },
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                      <h1 className="text-xl sm:text-2xl font-normal text-slate-900 break-words leading-tight tracking-tight">{lesson.title}</h1>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/course/${courseId}/lesson/${lessonId}/discussions`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="hidden sm:inline">Discuss</span>
                        </Link>
                        {isInstructorRole && (
                          <>
                            <button
                              onClick={toggleEditMode}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                editMode
                                  ? 'text-slate-700 border-slate-300 bg-slate-50 hover:bg-slate-100'
                                  : 'text-slate-400 border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                              title={editMode ? 'Turn off editing controls' : 'Turn on editing controls'}
                            >
                              <svg className="w-3.5 h-3.5 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {editMode ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                )}
                              </svg>
                              <span className="hidden sm:inline">{editMode ? 'Editing' : 'Edit'}</span>
                            </button>
                            {editMode && (
                              <Link
                                href={`/lessons/${lessonId}/edit`}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden sm:inline">Edit Lesson</span>
                                <span className="sm:hidden">Edit</span>
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
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
              </div>

              {/* Video Conferences */}
              <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100">
                <VideoConferenceSection
                  courseId={courseId}
                  lessonId={lessonId}
                  isInstructor={isInstructorRole && editMode}
                />
              </div>

              {/* Learning Outcomes */}
              {Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0 && (
                <div className="mx-5 sm:mx-8 my-5 sm:my-6 pl-4 border-l-2 border-slate-200">
                  <button
                    onClick={() => setOutcomesOpen(!outcomesOpen)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Learning Outcomes
                      <span className="ml-2 text-slate-300 normal-case tracking-normal">({lesson.learning_outcomes.length})</span>
                    </h3>
                    <svg
                      className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${outcomesOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
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
                  <button
                    onClick={() => setInstructionsOpen(!instructionsOpen)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Instructions
                    </h3>
                    <svg
                      className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-transform duration-200 ${instructionsOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${instructionsOpen ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                    <div className="prose prose-sm max-w-none text-slate-600 rich-text-content prose-headings:text-slate-800 prose-headings:font-medium" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                  </div>
                </div>
              )}

              {/* Lesson Content */}
              {(() => {
                const isVideoLesson = lesson.content_type === 'video' ||
                  (lesson.content?.length > 0 && lesson.content[0]?.type === 'video');
                const videoBlock = isVideoLesson ? lesson.content?.[0] : null;

                if (isVideoLesson && videoBlock) {
                  // Video-first layout
                  return (
                    <>
                      {/* Video edge-to-edge */}
                      <div className="bg-black">
                        <VideoPlayer
                          src={videoBlock.data?.url || videoBlock.data}
                          title={videoBlock.data?.title || lesson.title}
                          lessonId={lessonId}
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

                      {/* Tabs below video */}
                      <div className="border-b border-gray-200">
                        <nav className="flex gap-0 px-5 sm:px-8" aria-label="Tabs">
                          <button
                            onClick={() => setVideoTab('overview')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                              videoTab === 'overview'
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Overview
                          </button>
                          <button
                            onClick={() => setVideoTab('notes')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                              videoTab === 'notes'
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Notes & Questions
                          </button>
                        </nav>
                      </div>

                      {/* Tab content */}
                      <div className="px-5 sm:px-8 py-6 sm:py-8 min-h-[200px]">
                        {videoTab === 'overview' ? (
                          <div className="space-y-4">
                            {videoBlock.data?.description && (
                              <div className="prose prose-sm max-w-none text-slate-600 rich-text-content"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(videoBlock.data.description) }}
                              />
                            )}
                            {lesson.content.length > 1 && (
                              <LessonViewer
                                content={lesson.content.slice(1)}
                                lessonId={lessonId}
                                courseId={courseId}
                                lessonTitle={lesson.title}
                                isInstructor={isInstructorRole && editMode}
                                onContentUpdate={() => {
                                  fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' })
                                    .then(res => res.json())
                                    .then(data => setLesson(data))
                                    .catch(console.error);
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '350px' }}>
                            <VideoNotesPanel
                              lessonId={lessonId}
                              courseId={courseId}
                              currentTime={videoCurrentTime}
                              onSeek={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  );
                }

                // Standard non-video content
                return (
                  <div className="px-5 sm:px-8 py-6 sm:py-8 min-h-[200px]">
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
                        isInstructor={isInstructorRole && editMode}
                        onContentUpdate={() => {
                          fetch(`/api/lessons/${lessonId}`, { cache: 'no-store' })
                            .then(res => res.json())
                            .then(data => setLesson(data))
                            .catch(console.error);
                        }}
                      />
                    )}
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-t border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  {/* Previous Lesson */}
                  <button
                    onClick={() => prevId && router.push(`/course/${courseId}/lesson/${prevId}`)}
                    disabled={!prevId}
                    className="flex items-center text-sm text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  {/* Complete Button */}
                  <div className="flex items-center">
                    {!isCompleted && (
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

                  {/* Next Lesson */}
                  <button
                    onClick={() => nextId && router.push(`/course/${courseId}/lesson/${nextId}`)}
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

          {/* Sidebar */}
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
                        onClick={() => router.push(`/course/${courseId}/lesson/${l.id}`)}
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
              <LessonDiscussionsSidebar courseId={courseId} lessonId={lessonId} />

              {/* Session Recordings */}
              <SessionRecordingsCard courseId={courseId} lessonId={lessonId} />

              {/* Resource Links */}
              <ResourceLinksSidebar courseId={courseId} lessonId={lessonId} />

              {/* Gradebook Section */}
              {editMode && <RoleGuard roles={['instructor', 'curriculum_designer', 'admin', 'super_admin']}>
                <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Gradebook
                    </h3>
                  </div>
                  <div className="p-4">
                  <div className="space-y-1.5">
                    <Link
                      href={`/courses/${courseId}/gradebook`}
                      className="block w-full px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      View Gradebook
                    </Link>
                    <Link
                      href={`/courses/${courseId}/gradebook/setup`}
                      className="block w-full px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      Setup Gradebook
                    </Link>
                  </div>
                  </div>
                </div>
              </RoleGuard>}

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