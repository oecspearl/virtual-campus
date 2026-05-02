'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useSupabase } from '@/lib/supabase-provider';
import Button from '@/app/components/ui/Button';

interface Item {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  lesson_title_snapshot: string;
  position: number;
  item_type: 'selected' | 'recommended';
  rationale: string | null;
  path_outcomes: string[];
  path_instructions: string | null;
  insert_after_position: number | null;
  accepted: boolean | null;
}

interface CourseDetail {
  id: string;
  learner_goal: string;
  course_title: string | null;
  course_description: string | null;
  status: 'draft' | 'active' | 'archived';
  generated_syllabus: string | null;
  inferred_objectives: string[];
  flagged_gaps: string[];
  flagged_conflicts: string[];
  llm_provider: string | null;
  llm_model: string | null;
  created_at: string;
  approved_at: string | null;
  items: Item[];
}

type Decision = 'accepted' | 'rejected' | undefined;

type SequenceEntry =
  | { kind: 'selected'; item: Item; displayIndex: number }
  | { kind: 'recommendation'; item: Item };

// Selected items are ordered by `position`. Recommendations slot in *after*
// the selected item whose position matches their `insert_after_position`,
// reflecting how the LLM described the proposed insertion point. In draft we
// render every recommendation; in active we render only the accepted ones —
// rejected ones are not part of the path the learner approved.
function buildSequence(
  items: Item[],
  status: CourseDetail['status'],
): SequenceEntry[] {
  const selected = items
    .filter((i) => i.item_type === 'selected')
    .sort((a, b) => a.position - b.position);

  const visibleRecs = items.filter(
    (i) =>
      i.item_type === 'recommended' &&
      (status === 'draft' || i.accepted === true),
  );

  const lastSelectedPosition = selected[selected.length - 1]?.position ?? 0;
  const recsBySlot = new Map<number, Item[]>();
  const tail: Item[] = [];
  for (const r of visibleRecs) {
    const slot = r.insert_after_position;
    if (slot == null || slot > lastSelectedPosition) {
      tail.push(r);
    } else {
      const list = recsBySlot.get(slot) ?? [];
      list.push(r);
      recsBySlot.set(slot, list);
    }
  }

  const out: SequenceEntry[] = [];
  for (const r of recsBySlot.get(0) ?? []) {
    out.push({ kind: 'recommendation', item: r });
  }
  selected.forEach((sel, idx) => {
    out.push({ kind: 'selected', item: sel, displayIndex: idx + 1 });
    for (const r of recsBySlot.get(sel.position) ?? []) {
      out.push({ kind: 'recommendation', item: r });
    }
  });
  for (const r of tail) {
    out.push({ kind: 'recommendation', item: r });
  }
  return out;
}

function studyHrefFor(item: Item): string | null {
  return item.lesson_id && item.course_id
    ? `/course/${item.course_id}/lesson/${item.lesson_id}`
    : null;
}

export default function PersonalisedCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({});
  const [approving, setApproving] = React.useState(false);
  const [approveError, setApproveError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch(`/api/courses/personalise/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (cancelled) return;
      if (res.status === 404) {
        setNotFound(true);
      } else if (res.ok) {
        const data = (await res.json()) as CourseDetail;
        setCourse(data);
        const initial: Record<string, Decision> = {};
        for (const item of data.items) {
          if (item.item_type === 'recommended') {
            if (item.accepted === true) initial[item.id] = 'accepted';
            else if (item.accepted === false) initial[item.id] = 'rejected';
          }
        }
        setDecisions(initial);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, supabase]);

  const sequence = React.useMemo(
    () => (course ? buildSequence(course.items, course.status) : []),
    [course],
  );

  const firstStudyHref = React.useMemo(() => {
    for (const entry of sequence) {
      const href = studyHrefFor(entry.item);
      if (href) return href;
    }
    return null;
  }, [sequence]);

  const recsTotal = React.useMemo(
    () => (course ? course.items.filter((i) => i.item_type === 'recommended').length : 0),
    [course],
  );
  const recsPending = React.useMemo(() => {
    if (!course) return 0;
    return course.items.filter(
      (i) => i.item_type === 'recommended' && decisions[i.id] === undefined,
    ).length;
  }, [course, decisions]);
  const recsDecided = recsTotal - recsPending;

  const approve = async () => {
    if (!course) return;
    setApproving(true);
    setApproveError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const accepted = Object.entries(decisions).filter(([, v]) => v === 'accepted').map(([k]) => k);
      const rejected = Object.entries(decisions).filter(([, v]) => v === 'rejected').map(([k]) => k);
      const res = await fetch(`/api/courses/personalise/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          acceptedRecommendationIds: accepted,
          rejectedRecommendationIds: rejected,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApproveError(body.error ?? 'Failed to approve.');
        return;
      }
      router.refresh();
      window.location.reload();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Failed to approve.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Loading…</div>;
  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }
  if (!course) return null;

  const selectedCount = course.items.filter((i) => i.item_type === 'selected').length;
  const hasContext =
    !!course.course_description ||
    course.inferred_objectives.length > 0 ||
    !!course.generated_syllabus;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header>
        <nav className="text-xs text-gray-500 mb-3" aria-label="Breadcrumb">
          <Link href="/personalise" className="hover:text-gray-700 cursor-pointer transition-colors">
            My paths
          </Link>
          <span className="mx-1.5 text-gray-400">/</span>
          <span className="text-gray-700">
            {course.course_title ?? 'Untitled path'}
          </span>
        </nav>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-medium text-gray-900">
                {course.course_title ?? course.learner_goal}
              </h1>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <span className="font-medium text-gray-700">Goal:</span> {course.learner_goal}
            </p>
          </div>
          {course.status === 'active' && firstStudyHref && (
            <Link href={firstStudyHref} className="shrink-0">
              <Button>Continue learning →</Button>
            </Link>
          )}
        </div>
      </header>

      {hasContext && (
        <details className="group rounded-lg border bg-white" open>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors">
            <span>About this path</span>
            <ChevronDown className="text-gray-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="border-t px-4 py-4 space-y-5">
            {course.course_description && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{course.course_description}</ReactMarkdown>
              </div>
            )}
            {course.inferred_objectives.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                  What you&apos;ll learn
                </p>
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                  {course.inferred_objectives.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}
            {course.generated_syllabus && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                  Syllabus
                </p>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{course.generated_syllabus}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {course.flagged_conflicts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Conflicts to review</p>
          <ul className="mt-2 list-disc list-inside text-xs text-red-800 space-y-1">
            {course.flagged_conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-3">
          {course.status === 'active'
            ? 'Your path'
            : `Path · ${selectedCount} ${selectedCount === 1 ? 'lesson' : 'lessons'}${
                recsTotal > 0 ? ` + ${recsTotal} recommended` : ''
              }`}
        </h2>
        {sequence.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-xs text-gray-500">
            The model couldn&apos;t form a coherent sequence from the selected lessons.
            See the conflicts above.
          </div>
        ) : (
          <ol className="space-y-3">
            {sequence.map((entry) =>
              entry.kind === 'selected' ? (
                <li key={entry.item.id}>
                  <SelectedLessonCard
                    item={entry.item}
                    displayIndex={entry.displayIndex}
                    status={course.status}
                  />
                </li>
              ) : (
                <li key={entry.item.id}>
                  <RecommendedLessonCard
                    item={entry.item}
                    status={course.status}
                    decision={decisions[entry.item.id]}
                    onAccept={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'accepted' }))}
                    onReject={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'rejected' }))}
                  />
                </li>
              ),
            )}
          </ol>
        )}
      </section>

      {course.status === 'draft' && course.flagged_gaps.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Gaps the model identified</p>
          <ul className="mt-2 list-disc list-inside text-xs text-amber-800 space-y-1">
            {course.flagged_gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
          <p className="mt-2 text-[11px] text-amber-700">
            Accepting recommended additions above can help close these.
          </p>
        </section>
      )}

      {course.status === 'draft' && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-lg border bg-white shadow-md p-3">
            {approveError && (
              <p className="text-xs text-red-700 mb-2">{approveError}</p>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-gray-600 min-w-0">
                {recsTotal === 0 ? (
                  <>Approving locks the sequence and starts the path.</>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">
                      {recsDecided} of {recsTotal}
                    </span>{' '}
                    recommendations decided
                    {recsPending > 0 && (
                      <span className="text-gray-500">
                        {' '}· {recsPending} pending will be treated as rejected
                      </span>
                    )}
                  </>
                )}
              </div>
              <Button onClick={approve} disabled={approving}>
                {approving ? 'Approving…' : 'Approve & start'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {course.approved_at && (
        <p className="text-[11px] text-gray-400 pt-2">
          Approved {new Date(course.approved_at).toLocaleString()}
          {course.llm_provider && ` · Assembled by ${course.llm_provider}`}
        </p>
      )}
    </div>
  );
}

function SelectedLessonCard({
  item,
  displayIndex,
  status,
}: {
  item: Item;
  displayIndex: number;
  status: CourseDetail['status'];
}) {
  const studyHref = studyHrefFor(item);
  const isLinked = status === 'active' && !!studyHref;

  const inner = (
    <div className="flex gap-4 p-4">
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
        {displayIndex}
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-[15px] font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
          {item.lesson_title_snapshot}
        </p>
        {item.rationale && (
          <p className="text-xs text-gray-500 italic">{item.rationale}</p>
        )}
        {item.path_instructions && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700 leading-relaxed">
            {item.path_instructions}
          </div>
        )}
        {item.path_outcomes.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              What you&apos;ll learn
            </p>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
              {item.path_outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
        {item.lesson_id === null && (
          <p className="text-xs text-amber-700">
            This lesson has been deleted since the path was generated.
          </p>
        )}
      </div>
      {isLinked && (
        <span className="shrink-0 self-start text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors mt-1">
          Study →
        </span>
      )}
    </div>
  );

  if (isLinked) {
    return (
      <Link
        href={studyHref!}
        className="group block rounded-lg border bg-white hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
      >
        {inner}
      </Link>
    );
  }
  return <div className="group rounded-lg border bg-white">{inner}</div>;
}

function RecommendedLessonCard({
  item,
  status,
  decision,
  onAccept,
  onReject,
}: {
  item: Item;
  status: CourseDetail['status'];
  decision: Decision;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isDraft = status === 'draft';
  const studyHref = studyHrefFor(item);
  const isLinked = !isDraft && !!studyHref;

  const inner = (
    <div className="flex gap-4 p-4">
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-amber-400 text-amber-600 text-xs font-semibold">
        +
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded mb-1.5">
              Recommended
            </span>
            <p className="text-[15px] font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
              {item.lesson_title_snapshot}
            </p>
          </div>
          {isLinked && (
            <span className="shrink-0 self-start text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors mt-1">
              Study →
            </span>
          )}
        </div>
        {item.rationale && (
          <p className="text-xs text-gray-600">{item.rationale}</p>
        )}
        {item.path_instructions && (
          <div className="rounded-md bg-white/70 px-3 py-2 text-xs text-gray-700 leading-relaxed">
            {item.path_instructions}
          </div>
        )}
        {item.path_outcomes.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              What you&apos;ll learn
            </p>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
              {item.path_outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
        {item.lesson_id === null && (
          <p className="text-xs text-amber-700">
            This lesson has been deleted since the path was generated.
          </p>
        )}
        {isDraft && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onAccept}
              aria-pressed={decision === 'accepted'}
              className={`text-xs px-3 py-1 rounded border cursor-pointer transition-colors ${
                decision === 'accepted'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onReject}
              aria-pressed={decision === 'rejected'}
              className={`text-xs px-3 py-1 rounded border cursor-pointer transition-colors ${
                decision === 'rejected'
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const wrapperBase =
    'rounded-lg border border-gray-200 border-l-4 border-l-amber-300 bg-amber-50/30';

  if (isLinked) {
    return (
      <Link
        href={studyHref!}
        className={`group block ${wrapperBase} hover:border-l-indigo-400 hover:bg-amber-50/60 transition-colors cursor-pointer`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={`group ${wrapperBase}`}>{inner}</div>;
}

function StatusBadge({ status }: { status: CourseDetail['status'] }) {
  const palette = {
    draft: 'bg-amber-50 text-amber-800 border-amber-200',
    active: 'bg-green-50 text-green-800 border-green-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200',
  }[status];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${palette}`}
    >
      {status}
    </span>
  );
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
