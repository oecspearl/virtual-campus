'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  difficulty: number | null;
  estimated_time: number | null;
  content_type: string | null;
  course_id: string | null;
  course_title: string | null;
}

interface CatalogueResponse {
  lessons: Lesson[];
  total: number;
  courses: { id: string; title: string }[];
}

const MIN_LESSONS = 3;
const MAX_LESSONS = 30;
const PAGE_SIZE = 50;

export default function BuildPersonalisedCoursePage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [search, setSearch] = React.useState('');
  const [courseFilter, setCourseFilter] = React.useState('');
  const [page, setPage] = React.useState(0);

  const [data, setData] = React.useState<CatalogueResponse | null>(null);
  const [catalogueLoading, setCatalogueLoading] = React.useState(true);
  const [featureDisabled, setFeatureDisabled] = React.useState(false);

  // Selection survives filter/search/pagination changes — that's the whole
  // point of holding it at the page level instead of in the catalogue list.
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  // Keep a per-id title cache so the "Selected" panel can label lessons that
  // are no longer in the current filtered view.
  const [selectedTitles, setSelectedTitles] = React.useState<Record<string, string>>({});

  const [goal, setGoal] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  // Debounced fetch — re-runs whenever filter inputs change.
  React.useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setCatalogueLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCatalogueLoading(false); return; }
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (courseFilter) params.set('courseId', courseFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      const res = await fetch(`/api/courses/personalise/lessons?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (res.status === 404) setFeatureDisabled(true);
      else if (res.ok) setData(await res.json());
      setCatalogueLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [supabase, search, courseFilter, page]);

  const toggle = (lesson: Lesson) => {
    setSelectedIds((prev) => {
      if (prev.includes(lesson.id)) return prev.filter((id) => id !== lesson.id);
      if (prev.length >= MAX_LESSONS) return prev;
      return [...prev, lesson.id];
    });
    setSelectedTitles((prev) => ({ ...prev, [lesson.id]: lesson.title }));
  };

  const submit = async () => {
    setSubmitError('');
    if (goal.trim().length < 10) {
      setSubmitError('Goal must be at least 10 characters.');
      return;
    }
    if (selectedIds.length < MIN_LESSONS) {
      setSubmitError(`Pick at least ${MIN_LESSONS} lessons.`);
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch('/api/courses/personalise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ learnerGoal: goal.trim(), selectedLessonIds: selectedIds }),
      });
      const body = await res.json();
      if (res.status === 503 && body.draftId) {
        setSubmitError(body.message ?? 'Service temporarily unavailable.');
        // Send the learner to the draft anyway — selection is preserved.
        router.push(`/personalise/${body.draftId}`);
        return;
      }
      if (res.status === 429) {
        setSubmitError(body.message ?? 'Rate limit reached. Try again later.');
        return;
      }
      if (!res.ok) {
        setSubmitError(body.error ?? 'Failed to assemble the course.');
        return;
      }
      router.push(`/personalise/${body.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to assemble the course.');
    } finally {
      setSubmitting(false);
    }
  };

  if (featureDisabled) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-block animate-pulse rounded-full bg-indigo-100 p-6 mb-6">
          <div className="h-12 w-12 rounded-full bg-indigo-300" />
        </div>
        <h1 className="text-lg font-medium text-gray-900">Assembling your personalised course…</h1>
        <p className="mt-2 text-sm text-gray-500">
          This usually takes 10–30 seconds. We&apos;re sequencing your lessons,
          identifying gaps, and writing your syllabus.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/personalise" className="text-sm text-indigo-600 hover:underline">
        ← Back to my paths
      </Link>
      <h1 className="mt-2 text-2xl font-medium text-gray-900">Build a personalised path</h1>
      <p className="text-sm text-gray-500 mt-1">
        Pick {MIN_LESSONS}–{MAX_LESSONS} lessons that fit your goal.
        We&apos;ll sequence them, suggest additions, and flag any gaps.
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: catalogue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search lesson titles…"
                className="rounded-md border px-3 py-2 text-sm"
              />
              <select
                value={courseFilter}
                onChange={(e) => { setCourseFilter(e.target.value); setPage(0); }}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">All courses</option>
                {(data?.courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            {catalogueLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading lessons…</div>
            ) : (data?.lessons.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No lessons found. {data && data.courses.length === 0 && (
                  <>Your institution hasn&apos;t opted any courses into this feature yet.</>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {data!.lessons.map((lesson) => {
                  const checked = selectedIds.includes(lesson.id);
                  const atCap = !checked && selectedIds.length >= MAX_LESSONS;
                  return (
                    <li key={lesson.id} className={`p-4 flex gap-3 ${atCap ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={atCap}
                        onChange={() => toggle(lesson)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                        {lesson.course_title && (
                          <p className="text-xs text-gray-500 mt-0.5">{lesson.course_title}</p>
                        )}
                        {lesson.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{lesson.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || catalogueLoading}
              >
                Previous
              </Button>
              <span className="text-gray-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= data.total || catalogueLoading}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right: goal + selection summary */}
        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <label className="text-xs font-medium text-gray-700">Your learning goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I want to understand machine learning enough to build a recommendation system at work."
              rows={4}
              className="mt-2 w-full rounded-md border p-2 text-sm"
              maxLength={500}
            />
            <p className="mt-1 text-[11px] text-gray-400">{goal.length}/500</p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-700">
              Selected ({selectedIds.length}/{MAX_LESSONS}, min {MIN_LESSONS})
            </p>
            {selectedIds.length === 0 ? (
              <p className="mt-2 text-xs text-gray-400">No lessons selected yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {selectedIds.map((id) => (
                  <li key={id} className="flex items-start gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedIds((prev) => prev.filter((p) => p !== id))}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                    <span className="flex-1 text-gray-700">{selectedTitles[id] ?? id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {submitError}
            </div>
          )}

          <Button
            onClick={submit}
            disabled={submitting || goal.trim().length < 10 || selectedIds.length < MIN_LESSONS}
            className="w-full"
          >
            Assemble my path
          </Button>
        </aside>
      </div>
    </div>
  );
}
