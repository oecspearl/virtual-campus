'use client';

// Path-context lesson viewer (Phase 9c).
//
// We render the lesson content using the same dedicated immersive players
// the rest of the app uses — RichTextPlayer and SCORMPlayer — but pass them
// PATH-shaped props (courseTitle = path title, courseLessons = path items,
// onNavigate = path navigation, etc.). The players don't know they aren't
// inside a real course; the URL stays /personalise/<pathId>/lesson/<id>
// and there is no source-course leakage anywhere.
//
// Dispatch:
//   * content_type === 'scorm'  → SCORMPlayer (fetches scorm_package)
//   * everything else           → RichTextPlayer (handles content arrays
//                                  generically — text, video, mixed)
//
// Access still flows through /api/lessons/[id], gated by the Phase 7
// path-access bypass in lib/enrollment-check.ts.

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import RichTextPlayer from '@/app/components/editor/RichTextPlayer';
import SCORMPlayer from '@/app/components/media/SCORMPlayer';

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
