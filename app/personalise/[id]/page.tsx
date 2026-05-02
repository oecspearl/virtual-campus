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
  const recsAcceptedCount = React.useMemo(
    () =>
      course
        ? course.items.filter(
            (i) => i.item_type === 'recommended' && i.accepted === true,
          ).length
        : 0,
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

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-12 text-gray-500">Loading…</div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        </div>
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
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
        <Hero
          course={course}
          selectedCount={selectedCount}
          recsTotal={recsTotal}
          recsAcceptedCount={recsAcceptedCount}
          firstStudyHref={firstStudyHref}
        />

        {hasContext && (
          <details className="group rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" open>
            <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-gray-900 hover:bg-gray-50 flex items-center justify-between transition-colors">
              <span>About this path</span>
              <ChevronDown className="text-gray-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="border-t border-gray-100 px-5 py-5 space-y-6">
              {course.course_description && (
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  <ReactMarkdown>{course.course_description}</ReactMarkdown>
                </div>
              )}
              {course.inferred_objectives.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                    What you&apos;ll learn
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                    {course.inferred_objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
              {course.generated_syllabus && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-base font-semibold text-red-900">Conflicts to review</p>
            <ul className="mt-2 list-disc list-inside text-sm text-red-800 space-y-1">
              {course.flagged_conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {course.status === 'active' ? 'Your path' : 'Course path'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedCount} {selectedCount === 1 ? 'lesson' : 'lessons'}
              {recsTotal > 0 && course.status === 'draft' && (
                <> · {recsTotal} recommended addition{recsTotal === 1 ? '' : 's'} to review</>
              )}
              {recsAcceptedCount > 0 && course.status === 'active' && (
                <> + {recsAcceptedCount} accepted addition{recsAcceptedCount === 1 ? '' : 's'}</>
              )}
            </p>
          </div>
          {sequence.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
              The model couldn&apos;t form a coherent sequence from the selected lessons.
              See the conflicts above.
            </div>
          ) : (
            <ol>
              {sequence.map((entry, idx) => {
                const connectorBelow = idx < sequence.length - 1;
                return (
                  <li key={entry.item.id}>
                    {entry.kind === 'selected' ? (
                      <SelectedLessonCard
                        item={entry.item}
                        displayIndex={entry.displayIndex}
                        status={course.status}
                        connectorBelow={connectorBelow}
                      />
                    ) : (
                      <RecommendedLessonCard
                        item={entry.item}
                        status={course.status}
                        decision={decisions[entry.item.id]}
                        connectorBelow={connectorBelow}
                        onAccept={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'accepted' }))}
                        onReject={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'rejected' }))}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {course.status === 'draft' && course.flagged_gaps.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-base font-semibold text-amber-900">Gaps the model identified</p>
            <ul className="mt-2 list-disc list-inside text-sm text-amber-800 space-y-1">
              {course.flagged_gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              Accepting recommended additions above can help close these.
            </p>
          </section>
        )}

        {course.status === 'draft' && (
          <div className="sticky bottom-4 z-10">
            <div className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg p-4">
              {approveError && (
                <p className="text-xs text-red-700 mb-2">{approveError}</p>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-gray-700 min-w-0">
                  {recsTotal === 0 ? (
                    <>Approving locks the sequence and starts the path.</>
                  ) : (
                    <>
                      <span
                        className="inline-flex items-center justify-center min-w-[2rem] px-2 h-6 rounded-md text-white text-xs font-semibold mr-1.5"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                      >
                        {recsDecided}/{recsTotal}
                      </span>
                      <span className="font-medium text-gray-900">recommendations decided</span>
                      {recsPending > 0 && (
                        <span className="text-gray-500 text-xs block sm:inline sm:ml-2">
                          {recsPending} pending will be treated as rejected
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
          <p className="text-xs text-gray-400 pt-2">
            Approved {new Date(course.approved_at).toLocaleString()}
            {course.llm_provider && ` · Assembled by ${course.llm_provider}`}
          </p>
        )}
      </div>
    </div>
  );
}

function Hero({
  course,
  selectedCount,
  recsTotal,
  recsAcceptedCount,
  firstStudyHref,
}: {
  course: CourseDetail;
  selectedCount: number;
  recsTotal: number;
  recsAcceptedCount: number;
  firstStudyHref: string | null;
}) {
  const metaItems: Array<{ label: string; value: string | number }> = [
    { label: 'Lessons', value: selectedCount },
  ];
  if (recsTotal > 0) {
    metaItems.push({
      label: course.status === 'draft' ? 'Recommended' : 'Accepted additions',
      value: course.status === 'draft' ? recsTotal : recsAcceptedCount,
    });
  }
  if (course.inferred_objectives.length > 0) {
    metaItems.push({ label: 'Objectives', value: course.inferred_objectives.length });
  }
  if (course.llm_provider) {
    metaItems.push({ label: 'Assembled by', value: course.llm_provider });
  }

  return (
    <header className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 30%, transparent))`,
        }}
        aria-hidden="true"
      />

      <nav className="text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
        <Link href="/personalise" className="hover:text-gray-700 transition-colors">
          My paths
        </Link>
        <span className="mx-1.5 text-gray-400">/</span>
        <span className="text-gray-700">
          {course.course_title ?? 'Untitled path'}
        </span>
      </nav>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1 space-y-3">
          <StatusBadge status={course.status} />
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight tracking-tight">
            {course.course_title ?? course.learner_goal}
          </h1>
          <blockquote
            className="border-l-2 pl-4 text-[15px] text-gray-600 italic"
            style={{ borderColor: 'var(--theme-primary)' }}
          >
            {course.learner_goal}
          </blockquote>
        </div>
        {course.status === 'active' && firstStudyHref && (
          <Link href={firstStudyHref} className="shrink-0">
            <Button>Continue learning →</Button>
          </Link>
        )}
      </div>

      {metaItems.length > 0 && (
        <dl className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {metaItems.map((m) => (
            <div key={m.label}>
              <dt className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                {m.label}
              </dt>
              <dd className="mt-1 text-base font-semibold text-gray-900 capitalize">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

function PathRow({
  badge,
  connectorBelow,
  children,
}: {
  badge: React.ReactNode;
  connectorBelow: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 sm:gap-5 items-stretch">
      <div className="flex flex-col items-center shrink-0">
        {badge}
        {connectorBelow && (
          <div
            className="flex-1 w-px bg-gradient-to-b from-gray-200 to-gray-200 mt-1"
            aria-hidden="true"
          />
        )}
      </div>
      <div className={`flex-1 min-w-0 ${connectorBelow ? 'pb-5' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function SelectedBadge({ index }: { index: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-semibold ring-4 ring-gray-50 shadow-sm"
      style={{ backgroundColor: 'var(--theme-primary)' }}
    >
      {index}
    </span>
  );
}

function RecommendedBadge() {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed border-amber-400 bg-white text-amber-600 text-base font-semibold ring-4 ring-gray-50">
      +
    </span>
  );
}

function SelectedLessonCard({
  item,
  displayIndex,
  status,
  connectorBelow,
}: {
  item: Item;
  displayIndex: number;
  status: CourseDetail['status'];
  connectorBelow: boolean;
}) {
  const studyHref = studyHrefFor(item);
  const isLinked = status === 'active' && !!studyHref;

  const inner = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">
          {item.lesson_title_snapshot}
        </p>
        {isLinked && (
          <span className="shrink-0 text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors mt-0.5">
            Study →
          </span>
        )}
      </div>
      {item.rationale && (
        <p className="mt-2 text-sm text-gray-500 italic leading-relaxed">{item.rationale}</p>
      )}
      {item.path_instructions && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 leading-relaxed">
          {item.path_instructions}
        </div>
      )}
      {item.path_outcomes.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            What you&apos;ll learn
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {item.path_outcomes.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}
      {item.lesson_id === null && (
        <p className="mt-3 text-xs text-amber-700">
          This lesson has been deleted since the path was generated.
        </p>
      )}
    </div>
  );

  return (
    <PathRow badge={<SelectedBadge index={displayIndex} />} connectorBelow={connectorBelow}>
      {isLinked ? (
        <Link
          href={studyHref!}
          className="group block rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 motion-reduce:hover:transform-none transition-all duration-200 cursor-pointer"
        >
          {inner}
        </Link>
      ) : (
        <div className="group rounded-xl border border-gray-200 bg-white shadow-sm">
          {inner}
        </div>
      )}
    </PathRow>
  );
}

function RecommendedLessonCard({
  item,
  status,
  decision,
  connectorBelow,
  onAccept,
  onReject,
}: {
  item: Item;
  status: CourseDetail['status'];
  decision: Decision;
  connectorBelow: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isDraft = status === 'draft';
  const studyHref = studyHrefFor(item);
  const isLinked = !isDraft && !!studyHref;

  const inner = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded mb-1.5">
            Recommended
          </span>
          <p className="text-[15px] font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">
            {item.lesson_title_snapshot}
          </p>
        </div>
        {isLinked && (
          <span className="shrink-0 text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors mt-0.5">
            Study →
          </span>
        )}
      </div>
      {item.rationale && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.rationale}</p>
      )}
      {item.path_instructions && (
        <div className="mt-3 rounded-md bg-white/70 border border-amber-100 px-3 py-2 text-sm text-gray-700 leading-relaxed">
          {item.path_instructions}
        </div>
      )}
      {item.path_outcomes.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            What you&apos;ll learn
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {item.path_outcomes.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}
      {item.lesson_id === null && (
        <p className="mt-3 text-xs text-amber-700">
          This lesson has been deleted since the path was generated.
        </p>
      )}
      {isDraft && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            aria-pressed={decision === 'accepted'}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
              decision === 'accepted'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            aria-pressed={decision === 'rejected'}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
              decision === 'rejected'
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );

  const wrapperBase =
    'rounded-xl border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/40 shadow-sm';

  return (
    <PathRow badge={<RecommendedBadge />} connectorBelow={connectorBelow}>
      {isLinked ? (
        <Link
          href={studyHref!}
          className={`group block ${wrapperBase} hover:shadow-md hover:bg-amber-50/70 hover:-translate-y-0.5 motion-reduce:hover:transform-none transition-all duration-200 cursor-pointer`}
        >
          {inner}
        </Link>
      ) : (
        <div className={`group ${wrapperBase}`}>{inner}</div>
      )}
    </PathRow>
  );
}

function StatusBadge({ status }: { status: CourseDetail['status'] }) {
  const palette = {
    draft: 'bg-amber-50 text-amber-800 border-amber-200',
    active: 'bg-green-50 text-green-800 border-green-200',
    archived: 'bg-gray-50 text-gray-600 border-gray-200',
  }[status];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${palette}`}
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
