'use client';

// Path-context lesson viewer (Phase 9d).
//
// Renders lesson content using the same dedicated immersive layouts the
// course-context page uses — but with PATH-shaped data (path title, path
// lesson list, path navigation). The URL stays /personalise/<pathId>/lesson/
// <id> and there is no source-course leakage in URL or chrome.
//
// Dispatch (mirrors app/course/[id]/lesson/[lessonId]/page.tsx):
//   * content_type === 'scorm'                       → SCORMPlayer fullscreen
//   * content_type === 'video' OR first content item
//     is a video (and NOT rich_text)                 → custom video layout
//                                                       (top nav + tab bar +
//                                                       video + tab side panel)
//   * everything else                                → RichTextPlayer
//
// Access still flows through /api/lessons/[id], gated by the Phase 7
// path-access bypass in lib/enrollment-check.ts.

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import RichTextPlayer from '@/app/components/editor/RichTextPlayer';
import SCORMPlayer from '@/app/components/media/SCORMPlayer';
import VideoPlayer from '@/app/components/media/VideoPlayer';
import VideoNotesPanel from '@/app/components/media/VideoNotesPanel';
import VideoDiscussionThread from '@/app/components/media/VideoDiscussionThread';
import ResourceLinksSidebar from '@/app/components/lesson/ResourceLinksSidebar';
import SessionRecordingsCard from '@/app/components/conference/SessionRecordingsCard';
import AITutorPanel from '@/app/components/ai/AITutorPanel';
import { sanitizeHtml } from '@/lib/sanitize';

// ── Types ──────────────────────────────────────────────────────────────────

interface PathItem {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  lesson_title_snapshot: string;
  position: number;
  item_type: 'selected' | 'recommended';
  accepted: boolean | null;
}

interface PathDetail {
  id: string;
  course_title: string | null;
  learner_goal: string;
  status: 'draft' | 'active' | 'archived';
  items: PathItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lesson = any;

// ── Page ───────────────────────────────────────────────────────────────────

export default function PathLessonViewerPage() {
  const { id: pathId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [lesson, setLesson] = React.useState<Lesson | null>(null);
  const [path, setPath] = React.useState<PathDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scormPackage, setScormPackage] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<{ id: string; role?: string } | null>(null);
  const [progressMap, setProgressMap] = React.useState<Record<string, boolean>>({});
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  // Video-layout-specific state — mirrors the course page so the side panel
  // tabs (outcomes / notes / discussions / etc.) work identically.
  const [videoTab, setVideoTab] = React.useState<string | null>('outcomes');
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0);
  const videoSeekRef = React.useRef<((time: number) => void) | null>(null);
  const [outcomesOpen, setOutcomesOpen] = React.useState(false); // chapters↔notes sub-tab toggle

  // Effective lesson list for the player's sidebar — only items in the
  // active path (selected + accepted recs), in path order, mapped to the
  // shape RichTextPlayer's `courseLessons` prop expects.
  const pathLessons = React.useMemo(() => {
    if (!path?.items) return [];
    const active = path.items
      .filter((it) => it.lesson_id && it.accepted !== false)
      .sort((a, b) => a.position - b.position);
    return active.map((it) => ({
      id: it.lesson_id as string,
      title: it.lesson_title_snapshot,
      content_type: undefined,
      course_id: it.course_id ?? undefined,
    }));
  }, [path]);

  const idx = pathLessons.findIndex((l) => l.id === lessonId);
  const prevId = idx > 0 ? pathLessons[idx - 1]?.id ?? null : null;
  const nextId = idx >= 0 && idx < pathLessons.length - 1 ? pathLessons[idx + 1]?.id ?? null : null;

  // Single fetch effect — pulls lesson, path, profile, scorm package in parallel.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const auth = { Authorization: `Bearer ${session.access_token}` };

      const [lessonRes, pathRes, profileRes, scormRes] = await Promise.allSettled([
        fetch(`/api/lessons/${lessonId}`, { headers: auth, cache: 'no-store' }),
        fetch(`/api/courses/personalise/${pathId}`, { headers: auth, cache: 'no-store' }),
        fetch('/api/auth/profile', { headers: auth, cache: 'no-store' }),
        fetch(`/api/scorm/package/${lessonId}`, { headers: auth, cache: 'no-store' }),
      ]);
      if (cancelled) return;

      // Lesson
      if (lessonRes.status === 'fulfilled' && lessonRes.value.ok) {
        setLesson(await lessonRes.value.json());
      } else {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Path
      if (pathRes.status === 'fulfilled' && pathRes.value.ok) {
        const detail = (await pathRes.value.json()) as PathDetail;
        setPath(detail);
        // Defence: lesson must be in this path. If not, treat as 404.
        if (!detail.items.some((i) => i.lesson_id === lessonId && i.accepted !== false)) {
          setNotFound(true);
          setLoading(false);
          return;
        }
      } else {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Profile
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const p = await profileRes.value.json();
        if (p?.id) setProfile(p);
      }
      // SCORM (404 is expected for non-SCORM lessons)
      if (scormRes.status === 'fulfilled' && scormRes.value.ok) {
        const data = await scormRes.value.json();
        setScormPackage(data.scormPackage ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pathId, lessonId, supabase]);

  // Progress fetch — once we know the profile + path, pull lesson_progress for
  // every lesson in the path so the sidebar shows ticks.
  React.useEffect(() => {
    if (!profile?.id || pathLessons.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const auth = { Authorization: `Bearer ${session.access_token}` };
      const results = await Promise.all(
        pathLessons.map((l) =>
          fetch(`/api/progress/${profile.id}/${l.id}`, { headers: auth, cache: 'no-store' })
            .then((res) => res.ok ? res.json() : null)
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      const map: Record<string, boolean> = {};
      pathLessons.forEach((l, i) => {
        const p = results[i];
        map[l.id] = p?.status === 'completed' || p?.completed === true;
      });
      setProgressMap(map);
      setIsCompleted(map[lessonId] === true);
    })();
    return () => { cancelled = true; };
  }, [profile, pathLessons, lessonId, supabase]);

  const markComplete = async () => {
    if (!profile?.id || isCompleting) return;
    setIsCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/progress/${profile.id}/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
      });
      setIsCompleted(true);
      setProgressMap((prev) => ({ ...prev, [lessonId]: true }));
    } catch (err) {
      console.error('Mark complete failed:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const navigateInPath = (id: string) => {
    router.push(`/personalise/${pathId}/lesson/${id}`);
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-slate-200 border-t-slate-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading lesson...</p>
        </div>
      </div>
    );
  }
  if (notFound || !lesson || !path) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href={`/personalise/${pathId}`} className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to path
        </Link>
      </div>
    );
  }

  const pathTitle = path.course_title ?? path.learner_goal;
  const isInstructorRole =
    !!profile?.role &&
    ['instructor', 'curriculum_designer', 'admin', 'super_admin'].includes(profile.role);

  // Path-wide progress %, used in the video layout's top bar.
  const completedCount = pathLessons.filter((l) => progressMap[l.id]).length;
  const progress = pathLessons.length > 0 ? Math.round((completedCount / pathLessons.length) * 100) : 0;

  const isVideoLesson =
    lesson.content_type === 'video' ||
    (lesson.content?.length > 0 &&
      lesson.content[0]?.type === 'video' &&
      lesson.content_type !== 'rich_text');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoBlock: any = isVideoLesson ? lesson.content?.[0] : null;

  // ── Video lesson dispatch (custom layout matching app/course/[id]/lesson) ─
  // Mirrors the course-context video lesson layout so a video lesson studied
  // via a path looks identical to one studied directly — top dark nav bar,
  // tab bar, video, side panel — but with path identity in the chrome.

  if (isVideoLesson && videoBlock) {
    const vChapters = videoBlock.data?.chapters || [];
    const hasChapters = vChapters.length > 0;
    const setChapterSubTab = setOutcomesOpen; // reuse for chapters/notes sub-tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vtabs: { id: string; label: string; icon: string }[] = [
      ...(Array.isArray(lesson.learning_outcomes) && lesson.learning_outcomes.length > 0
        ? [{ id: 'outcomes', label: 'Learning Outcomes', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }] : []),
      ...(lesson.lesson_instructions
        ? [{ id: 'instructions', label: 'Instructions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }] : []),
      { id: 'overview', label: 'Overview', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { id: 'notes', label: 'Notes & Questions', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
      { id: 'discussions', label: 'Discussions', icon: 'M20 12c0 1.363-.469 2.621-1.256 3.613-.236.297-.462.564-.676.808C17.012 17.547 12 20 12 20s-5.012-2.453-6.068-3.579a10.06 10.06 0 01-.676-.808A5.961 5.961 0 014 12c0-3.314 2.686-6 6-6a5.96 5.96 0 012 .344A5.96 5.96 0 0114 6c3.314 0 6 2.686 6 6z' },
      { id: 'resources', label: 'Resources', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
      { id: 'ai-tutor', label: 'AI Tutor', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 002.455 2.456z' },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentChapterIdx = vChapters.reduce((acc: number, ch: any, i: number) => (videoCurrentTime >= ch.time ? i : acc), 0);
    const handleVideoTabClick = (key: string) => {
      setVideoTab((prev) => (prev === key ? null : key));
    };
    const fmtTs = (s: number) => {
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };
    const sourceCourseId: string = lesson.course_id;

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        {/* ZONE A: Top nav bar — path-aware breadcrumb */}
        <div className="h-12 flex items-center justify-between px-2 sm:px-4 bg-gray-900 shrink-0 z-50" style={{ position: 'sticky', top: 0 }}>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 mr-2">
            <Link href={`/personalise/${pathId}`} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline truncate max-w-[180px]">{pathTitle}</span>
            </Link>
            <span className="text-gray-600 hidden sm:inline">/</span>
            <span className="text-white text-sm font-medium truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <span className="text-gray-400 text-sm tabular-nums">{progress}%</span>
            <button onClick={() => router.refresh()} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={() => prevId && navigateInPath(prevId)} disabled={!prevId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => nextId && navigateInPath(nextId)} disabled={!nextId} className="text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {isCompleted ? (
              <span className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-gray-600 text-gray-400 cursor-default whitespace-nowrap">Completed</span>
            ) : (
              <button onClick={markComplete} disabled={isCompleting} className="px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:bg-gray-600 disabled:text-gray-400 whitespace-nowrap">
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

        {/* ZONE B: Tab bar */}
        <div className="h-10 flex items-center bg-white border-b border-gray-200 shrink-0 z-40 overflow-x-auto" style={{ position: 'sticky', top: 48 }}>
          {vtabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleVideoTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-4 h-10 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                videoTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
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
                <span className="text-sm font-semibold text-gray-900">{vtabs.find((t) => t.id === videoTab)?.label}</span>
                <button onClick={() => setVideoTab(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {videoTab !== 'ai-tutor' && (
                <div className="flex-1 overflow-y-auto">
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
                  {videoTab === 'instructions' && lesson.lesson_instructions && (
                    <div className="p-4">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="prose prose-sm max-w-none text-amber-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                      </div>
                    </div>
                  )}
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
                  {videoTab === 'notes' && (
                    <VideoNotesPanel lessonId={lessonId} courseId={sourceCourseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />
                  )}
                  {videoTab === 'discussions' && (
                    <VideoDiscussionThread lessonId={lessonId} courseId={sourceCourseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />
                  )}
                  {videoTab === 'resources' && (
                    <div className="p-4 space-y-4">
                      <ResourceLinksSidebar courseId={sourceCourseId} lessonId={lessonId} collapsible={false} />
                      <SessionRecordingsCard courseId={sourceCourseId} lessonId={lessonId} />
                    </div>
                  )}
                </div>
              )}
              {videoTab === 'ai-tutor' && (
                <div className="flex-1 overflow-hidden">
                  <AITutorPanel lessonId={lessonId} courseId={sourceCourseId} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ZONE C: Three-column video row */}
        <div className="flex flex-1 overflow-hidden">
          {hasChapters && (
            <div className="hidden lg:flex flex-col shrink-0 bg-gray-950 overflow-hidden w-[140px] xl:w-[168px]">
              <div className="flex border-b border-gray-800">
                <button onClick={() => setChapterSubTab(false)} className={`flex-1 py-2 text-xs font-medium transition-colors ${!outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Chapters</button>
                <button onClick={() => setChapterSubTab(true)} className={`flex-1 py-2 text-xs font-medium transition-colors ${outcomesOpen ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Notes</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {!outcomesOpen ? (
                  <div>
                    <p className="text-[10px] uppercase text-gray-600 px-3 pt-3 pb-1 tracking-wider">Chapters ({vChapters.length})</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                  <div className="p-2">
                    <p className="text-[10px] uppercase text-gray-600 px-1 pt-1 pb-2 tracking-wider">Timestamped Notes</p>
                    <p className="text-[10px] text-gray-600 px-1">Open the Notes tab to add notes. Click a timestamp to seek.</p>
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
                courseId={sourceCourseId}
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
                  <span className="text-sm font-semibold text-gray-900">{vtabs.find((t) => t.id === videoTab)?.label}</span>
                  <button onClick={() => setVideoTab(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close panel">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {videoTab !== 'ai-tutor' && (
                  <div className="flex-1 overflow-y-auto">
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
                    {videoTab === 'instructions' && lesson.lesson_instructions && (
                      <div className="p-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className="prose prose-sm max-w-none text-amber-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.lesson_instructions) }} />
                        </div>
                      </div>
                    )}
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
                    {videoTab === 'notes' && (
                      <VideoNotesPanel lessonId={lessonId} courseId={sourceCourseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />
                    )}
                    {videoTab === 'discussions' && (
                      <VideoDiscussionThread lessonId={lessonId} courseId={sourceCourseId} currentTime={videoCurrentTime} onSeek={(time) => videoSeekRef.current?.(time)} />
                    )}
                    {videoTab === 'resources' && (
                      <div className="p-4 space-y-4">
                        <ResourceLinksSidebar courseId={sourceCourseId} lessonId={lessonId} collapsible={false} />
                        <SessionRecordingsCard courseId={sourceCourseId} lessonId={lessonId} />
                      </div>
                    )}
                  </div>
                )}
                {videoTab === 'ai-tutor' && (
                  <div className="flex-1 overflow-hidden">
                    <AITutorPanel lessonId={lessonId} courseId={sourceCourseId} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SCORM dispatch ────────────────────────────────────────────────────────

  if (lesson.content_type === 'scorm' && scormPackage) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-40">
        {/* Minimal top bar with path breadcrumb (SCORMPlayer has its own context bar inside) */}
        <header className="h-12 border-b bg-white flex items-center px-4 gap-2 text-xs text-gray-600 shrink-0">
          <Link href="/personalise" className="hover:underline">My Paths</Link>
          <span className="text-gray-400">/</span>
          <Link href={`/personalise/${pathId}`} className="hover:underline">{pathTitle}</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium truncate">{lesson.title}</span>
        </header>
        <div className="flex-1 overflow-hidden">
          <SCORMPlayer
            packageUrl={scormPackage.package_url}
            scormPackageId={scormPackage.id}
            scormVersion={scormPackage.scorm_version}
            courseId={lesson.course_id}
            lessonId={lessonId}
            title={scormPackage.title || lesson.title}
            lessonTitle={lesson.title}
            moduleTitle={pathTitle}
            lessonDescription={lesson.description}
            learningOutcomes={lesson.learning_outcomes}
            instructions={lesson.lesson_instructions}
            lessonIndex={idx}
            totalLessons={pathLessons.length}
            onMarkComplete={markComplete}
            isCompleted={isCompleted}
          />
        </div>
      </div>
    );
  }

  // ── Default dispatch: RichTextPlayer ──────────────────────────────────────
  // Handles rich text, mixed content, video items inside content arrays — same
  // as the course-context "RichTextPlayer fallback" branch in
  // app/course/[id]/lesson/[lessonId]/page.tsx.

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-40">
      <RichTextPlayer
        courseId={lesson.course_id}
        lessonId={lessonId}
        lessonTitle={lesson.title}
        courseTitle={pathTitle}
        lessonDescription={lesson.description}
        learningOutcomes={lesson.learning_outcomes}
        instructions={lesson.lesson_instructions}
        content={lesson.content || []}
        lessonIndex={idx}
        totalLessons={pathLessons.length}
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        isInstructor={isInstructorRole}
        onMarkComplete={markComplete}
        onNavigate={navigateInPath}
        prevLessonId={prevId}
        nextLessonId={nextId}
        courseLessons={pathLessons}
        lessonProgressMap={progressMap}
      />
    </div>
  );
}
