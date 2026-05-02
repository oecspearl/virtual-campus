'use client';

// Path-context lesson viewer.
//
// When a learner studies a lesson via their personalised path, they hit
// this page instead of /course/<sourceCourseId>/lesson/<id>. We reuse the
// existing LessonViewer component for the actual content rendering — only
// the chrome (breadcrumb, sidebar, prev/next) is path-aware so the learner
// never sees the source course's identity.
//
// Access works via the Phase 7 bypass in lib/enrollment-check.ts:
// /api/lessons/[id] grants access when the lesson is part of the learner's
// approved personalised path, even when they aren't enrolled in the parent
// course.

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase-provider';
import LessonViewer from '@/app/components/lesson/LessonViewer';
import Button from '@/app/components/ui/Button';

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

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  course_id: string | null;
  published: boolean;
}

// ── Sequence helpers ───────────────────────────────────────────────────────

/**
 * Returns the ordered list of items the learner can study via the path —
 * selected lessons in position order plus accepted recommendations slotted
 * after their `insert_after_position` (mirrors the active-view logic on
 * /personalise/[id]). Recommendations whose `accepted` is null/false are
 * excluded — they aren't part of the active path.
 */
function buildStudyOrder(detail: PathDetail): PathItem[] {
  const selected = detail.items
    .filter((i) => i.item_type === 'selected')
    .sort((a, b) => a.position - b.position);

  // Active mode: only include accepted recommendations. Draft mode: include
  // all (so the learner can preview them).
  const recsInPlay = detail.items.filter(
    (i) =>
      i.item_type === 'recommended' &&
      (detail.status === 'draft' || i.accepted === true),
  );

  const result: PathItem[] = [...selected];
  // Recommendations are append-only here for navigation — the proper slot
  // ordering only matters for the curated overview on /personalise/[id].
  for (const r of recsInPlay) {
    if (!result.find((x) => x.id === r.id)) result.push(r);
  }
  return result;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PathLessonViewerPage() {
  const { id: pathId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [lesson, setLesson] = React.useState<Lesson | null>(null);
  const [path, setPath] = React.useState<PathDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const auth = { Authorization: `Bearer ${session.access_token}` };

      const [pathRes, lessonRes, profileRes] = await Promise.all([
        fetch(`/api/courses/personalise/${pathId}`, { headers: auth, cache: 'no-store' }),
        fetch(`/api/lessons/${lessonId}`, { headers: auth, cache: 'no-store' }),
        fetch('/api/auth/profile', { headers: auth, cache: 'no-store' }),
      ]);
      if (cancelled) return;

      if (pathRes.status === 404 || lessonRes.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!pathRes.ok || !lessonRes.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const pathData = (await pathRes.json()) as PathDetail;
      const lessonData = (await lessonRes.json()) as Lesson;

      // Defence: lesson must actually be in this path. (The /api/lessons/[id]
      // bypass only grants access when the lesson is in some active path
      // owned by the user — but doesn't enforce it's THIS path. Without
      // this check, learners could URL-edit to study lessons from their
      // OTHER paths under this path's chrome.)
      const isInPath = pathData.items.some((i) => i.lesson_id === lessonId && i.accepted !== false);
      if (!isInPath) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPath(pathData);
      setLesson(lessonData);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile?.id) {
          setProfileId(profile.id);
          // Load progress — completion ticks for the sidebar are loaded below.
          try {
            const progressRes = await fetch(`/api/progress/${profile.id}/${lessonId}`, {
              headers: auth,
              cache: 'no-store',
            });
            if (progressRes.ok) {
              const data = await progressRes.json();
              setCompleted(data?.status === 'completed' || data?.completed === true);
            }
          } catch {
            // Silent — progress is non-blocking.
          }
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pathId, lessonId, supabase]);

  const order = path ? buildStudyOrder(path) : [];
  const currentIndex = order.findIndex((i) => i.lesson_id === lessonId);
  const prev = currentIndex > 0 ? order[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

  const markComplete = async () => {
    if (!profileId || completing || completed) return;
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/progress/${profileId}/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'completed', progress_percentage: 100 }),
      });
      setCompleted(true);
    } catch (err) {
      console.error('Mark complete failed:', err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading…</div>;
  }
  if (notFound || !path || !lesson) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const pathTitle = path.course_title ?? path.learner_goal;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Path-aware breadcrumb */}
      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/personalise" className="hover:underline">My Paths</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/personalise/${pathId}`} className="hover:underline">{pathTitle}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-700">{lesson.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Path lesson sidebar */}
        <aside className="lg:sticky lg:top-4 lg:self-start space-y-1 rounded-lg border bg-white p-2">
          <div className="px-2 py-2 border-b mb-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Path</p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{pathTitle}</p>
          </div>
          <ol className="space-y-0.5">
            {order.map((it, idx) => {
              const isCurrent = it.lesson_id === lessonId;
              const href =
                it.lesson_id
                  ? `/personalise/${pathId}/lesson/${it.lesson_id}`
                  : null;
              return (
                <li key={it.id}>
                  {href ? (
                    <Link
                      href={href}
                      className={`block px-2 py-1.5 rounded text-xs ${
                        isCurrent
                          ? 'bg-indigo-50 text-indigo-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400 mr-1.5">{idx + 1}.</span>
                      {it.lesson_title_snapshot}
                    </Link>
                  ) : (
                    <span className="block px-2 py-1.5 text-xs text-gray-400 italic">
                      <span className="mr-1.5">{idx + 1}.</span>
                      {it.lesson_title_snapshot} (deleted)
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Main content */}
        <main>
          <header className="mb-4">
            <h1 className="text-2xl font-medium text-gray-900">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{lesson.description}</p>
            )}
          </header>

          <LessonViewer
            content={Array.isArray(lesson.content) ? lesson.content : []}
            lessonId={lesson.id}
            courseId={lesson.course_id ?? undefined}
            lessonTitle={lesson.title}
          />

          {/* Footer: prev / mark complete / next */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t pt-4">
            <div>
              {prev?.lesson_id ? (
                <Link
                  href={`/personalise/${pathId}/lesson/${prev.lesson_id}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  ← {prev.lesson_title_snapshot}
                </Link>
              ) : (
                <span />
              )}
            </div>

            <Button
              onClick={markComplete}
              disabled={completing || completed}
              variant={completed ? 'outline' : undefined}
            >
              {completed ? '✓ Completed' : completing ? 'Marking…' : 'Mark complete'}
            </Button>

            <div>
              {next?.lesson_id ? (
                <Link
                  href={`/personalise/${pathId}/lesson/${next.lesson_id}`}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {next.lesson_title_snapshot} →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/personalise/${pathId}`)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Back to path →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
