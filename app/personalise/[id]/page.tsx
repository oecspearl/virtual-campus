'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSupabase } from '@/lib/supabase-provider';
import PersonalisedCourseHero from '@/app/components/personalise/PersonalisedCourseHero';

// ----------------------------------------------------------------------------
// Markdown helpers
// ----------------------------------------------------------------------------

const markdownPlugins = [remarkGfm];

// The LLM occasionally collapses an entire markdown table onto a single line —
// header, "|---|" separator, and all data rows concatenated with spaces but no
// newlines. GFM cannot parse that as a table. We detect single-line tables by
// spotting the separator alongside other content and split rows by counting
// pipes (each row has cellCount + 1 pipes).
function normalizeSyllabusMarkdown(md: string): string {
  return md
    .split('\n')
    .flatMap((line) => splitInlineTable(line))
    .join('\n');
}

function splitInlineTable(line: string): string[] {
  const sepMatch = line.match(/\|(?:\s*:?-+:?\s*\|)+/);
  if (!sepMatch) return [line];
  const sep = sepMatch[0];
  const sepStart = line.indexOf(sep);
  const sepEnd = sepStart + sep.length;
  const before = line.slice(0, sepStart).trim();
  const after = line.slice(sepEnd).trim();
  if (!before && !after) return [line];

  const cellCount = (sep.match(/\|/g)?.length ?? 1) - 1;
  const pipesPerRow = cellCount + 1;

  const dataRows: string[] = [];
  let pipeCount = 0;
  let start = 0;
  for (let i = 0; i < after.length; i++) {
    if (after[i] === '|') {
      pipeCount++;
      if (pipeCount === pipesPerRow) {
        const row = after.slice(start, i + 1).trim();
        if (row) dataRows.push(row);
        start = i + 1;
        pipeCount = 0;
      }
    }
  }
  const trailing = after.slice(start).trim();
  if (trailing) dataRows.push(trailing);

  return [before, sep, ...dataRows].filter(Boolean);
}

const markdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="not-prose overflow-x-auto my-4 rounded-md border border-gray-200">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-gray-100 last:border-b-0 even:bg-gray-50/40">
      {children}
    </tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 border-r border-gray-200 last:border-r-0 align-top">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-100 last:border-r-0 align-top leading-relaxed">
      {children}
    </td>
  ),
  hr: () => <hr className="my-5 border-gray-200" />,
};

const proseClass =
  'prose prose-sm max-w-none text-gray-700 leading-relaxed ' +
  'prose-headings:text-gray-900 prose-headings:font-semibold ' +
  'prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 ' +
  'prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 ' +
  'prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-1.5 ' +
  'prose-p:my-2 prose-p:leading-relaxed ' +
  'prose-strong:text-gray-900 ' +
  'prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:leading-relaxed ' +
  'prose-hr:border-gray-200 prose-hr:my-5 ' +
  'marker:text-gray-400';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

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

const TAB_KEYS = ['overview', 'path', 'syllabus'] as const;
type TabKey = typeof TAB_KEYS[number];

// ----------------------------------------------------------------------------
// Sequence merge (selected items in position order, recommendations slotted at
// insert_after_position; in active mode only accepted recommendations show)
// ----------------------------------------------------------------------------

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

function studyHrefFor(item: Item, pathId: string): string | null {
  // Routes to the existing course-context lesson viewer (single source of
  // truth for SCORM / RichText / Video / mixed-content rendering) but in
  // path mode (?path=<pathId>). The lesson viewer reads the param and
  // swaps in path-aware breadcrumb, sidebar, prev/next while keeping all
  // content rendering identical to the rest of the app.
  return item.lesson_id && item.course_id
    ? `/course/${item.course_id}/lesson/${item.lesson_id}?path=${pathId}`
    : null;
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function PersonalisedCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({});
  const [approving, setApproving] = React.useState(false);
  const [approveError, setApproveError] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<TabKey>(() => {
    const t = searchParams.get('tab');
    return (TAB_KEYS as readonly string[]).includes(t ?? '') ? (t as TabKey) : 'overview';
  });

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
      const href = studyHrefFor(entry.item, id);
      if (href) return href;
    }
    return null;
  }, [sequence, id]);

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
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="h-64 sm:h-72 animate-pulse bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-80" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-lg h-48 animate-pulse" />
            <div className="bg-white rounded-lg h-64 animate-pulse" />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg h-72 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-xl font-medium text-gray-900">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }
  if (!course) return null;

  const selectedCount = course.items.filter((i) => i.item_type === 'selected').length;

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'path', label: 'Path' },
    { key: 'syllabus', label: 'Syllabus' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PersonalisedCourseHero
        title={course.course_title ?? course.learner_goal}
        goal={course.learner_goal}
        status={course.status}
        selectedCount={selectedCount}
        recsTotal={recsTotal}
        recsAcceptedCount={recsAcceptedCount}
        objectivesCount={course.inferred_objectives.length}
        llmProvider={course.llm_provider}
      />

      {/* Tab bar — sticky below hero, matches CourseTabBar visual language */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 sm:px-10 lg:px-12">
          <nav className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px" aria-label="Path tabs">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative text-[13px] px-4 py-3 border-b-2 whitespace-nowrap transition-colors shrink-0 font-medium cursor-pointer ${
                    active ? '' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  style={
                    active
                      ? { borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }
                      : undefined
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile-only sticky CTA — Approve in draft, Continue in active */}
      {(course.status === 'draft' || (course.status === 'active' && firstStudyHref)) && (
        <div className="lg:hidden sticky top-[41px] z-30 bg-white border-b border-gray-200/80 px-4 py-3">
          {course.status === 'draft' ? (
            <button
              type="button"
              onClick={approve}
              disabled={approving}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {approving
                ? 'Approving…'
                : recsTotal > 0
                  ? `Approve & Start (${recsDecided}/${recsTotal} decided)`
                  : 'Approve & Start'}
            </button>
          ) : firstStudyHref ? (
            <Link
              href={firstStudyHref}
              className="block w-full px-4 py-2.5 text-sm font-semibold text-white text-center rounded-lg bg-emerald-700 hover:bg-emerald-800 transition-colors"
            >
              Continue learning →
            </Link>
          ) : null}
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-6 min-h-[calc(100vh-280px)]">
        <div className="lg:col-span-4 min-w-0 px-4 sm:px-6 lg:px-10 py-6 space-y-6 overflow-y-auto overflow-x-hidden">
          {/* Conflicts banner — visible on every tab when present */}
          {course.flagged_conflicts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Conflicts to review</p>
              <ul className="mt-2 list-disc list-inside text-sm text-red-800 space-y-1">
                {course.flagged_conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewTab
              course={course}
              onJumpToPath={() => setActiveTab('path')}
            />
          )}

          {activeTab === 'path' && (
            <PathTab
              course={course}
              sequence={sequence}
              selectedCount={selectedCount}
              recsTotal={recsTotal}
              decisions={decisions}
              setDecisions={setDecisions}
            />
          )}

          {activeTab === 'syllabus' && <SyllabusTab course={course} />}
        </div>

        {/* Persistent sidebar */}
        <aside className="lg:col-span-2 hidden lg:block bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-5 space-y-4">
            <PathSummaryCard
              course={course}
              selectedCount={selectedCount}
              recsTotal={recsTotal}
              recsAcceptedCount={recsAcceptedCount}
              recsDecided={recsDecided}
              recsPending={recsPending}
              firstStudyHref={firstStudyHref}
              approving={approving}
              approveError={approveError}
              onApprove={approve}
            />
            <QuickLinksCard />
            {course.approved_at && (
              <p className="text-[11px] text-gray-400 px-1">
                Approved {new Date(course.approved_at).toLocaleDateString()}
                {course.llm_model && (
                  <>
                    <br />Model: {course.llm_model}
                  </>
                )}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab content
// ----------------------------------------------------------------------------

function OverviewTab({
  course,
  onJumpToPath,
}: {
  course: CourseDetail;
  onJumpToPath: () => void;
}) {
  const hasContent =
    !!course.course_description ||
    course.inferred_objectives.length > 0 ||
    (course.flagged_gaps.length > 0 && course.status === 'draft');

  if (!hasContent) {
    return (
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
        <p className="text-sm text-gray-400 py-12 text-center">
          No overview available for this path.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
      <div className="px-6 py-5 space-y-6">
        {course.course_description && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              About this path
            </p>
            <div className={proseClass}>
              <ReactMarkdown
                remarkPlugins={markdownPlugins}
                components={markdownComponents}
              >
                {normalizeSyllabusMarkdown(course.course_description)}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {course.inferred_objectives.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              What you&apos;ll learn
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1.5 marker:text-gray-400">
              {course.inferred_objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}

        {course.status === 'draft' && course.flagged_gaps.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Gaps the model identified</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 space-y-1 marker:text-amber-500">
              {course.flagged_gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
            <button
              type="button"
              onClick={onJumpToPath}
              className="mt-3 text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 cursor-pointer"
            >
              Review recommended additions in the Path tab →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PathTab({
  course,
  sequence,
  selectedCount,
  recsTotal,
  decisions,
  setDecisions,
}: {
  course: CourseDetail;
  sequence: SequenceEntry[];
  selectedCount: number;
  recsTotal: number;
  decisions: Record<string, Decision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, Decision>>>;
}) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {course.status === 'active' ? 'Your path' : 'Course path'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {selectedCount} {selectedCount === 1 ? 'lesson' : 'lessons'}
          {recsTotal > 0 && course.status === 'draft' && (
            <> · {recsTotal} recommended addition{recsTotal === 1 ? '' : 's'} to review</>
          )}
        </p>
      </div>

      {sequence.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-500">
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
                    pathId={course.id}
                  />
                ) : (
                  <RecommendedLessonCard
                    item={entry.item}
                    status={course.status}
                    decision={decisions[entry.item.id]}
                    connectorBelow={connectorBelow}
                    onAccept={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'accepted' }))}
                    onReject={() => setDecisions((p) => ({ ...p, [entry.item.id]: 'rejected' }))}
                    pathId={course.id}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function SyllabusTab({ course }: { course: CourseDetail }) {
  if (!course.generated_syllabus) {
    return (
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
        <p className="text-sm text-gray-400 py-12 text-center">
          No syllabus has been generated for this path.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden">
      <div className="px-6 py-5">
        <div className={proseClass}>
          <ReactMarkdown
            remarkPlugins={markdownPlugins}
            components={markdownComponents}
          >
            {normalizeSyllabusMarkdown(course.generated_syllabus)}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sidebar cards
// ----------------------------------------------------------------------------

function PathSummaryCard({
  course,
  selectedCount,
  recsTotal,
  recsAcceptedCount,
  recsDecided,
  recsPending,
  firstStudyHref,
  approving,
  approveError,
  onApprove,
}: {
  course: CourseDetail;
  selectedCount: number;
  recsTotal: number;
  recsAcceptedCount: number;
  recsDecided: number;
  recsPending: number;
  firstStudyHref: string | null;
  approving: boolean;
  approveError: string;
  onApprove: () => void;
}) {
  const stats: Array<{ label: string; value: string | number }> = [
    { label: 'Lessons', value: selectedCount },
  ];
  if (recsTotal > 0) {
    stats.push({
      label: course.status === 'draft' ? 'Recommended' : 'Added',
      value: course.status === 'draft' ? recsTotal : recsAcceptedCount,
    });
  }
  if (course.inferred_objectives.length > 0) {
    stats.push({ label: 'Objectives', value: course.inferred_objectives.length });
  }
  if (course.llm_provider) {
    stats.push({ label: 'Provider', value: course.llm_provider });
  }

  const decisionPct = recsTotal === 0 ? 100 : Math.round((recsDecided / recsTotal) * 100);

  return (
    <div className="rounded-lg border border-gray-200/60 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800">
        <p className="text-sm font-bold text-white">
          {course.status === 'draft' ? 'Review your path' : 'Your personalised path'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {course.status === 'draft' ? 'Approve to start learning' : 'Pick up where you left off'}
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className="text-[13px] font-semibold text-gray-800 mt-0.5 capitalize truncate">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {course.status === 'draft' && recsTotal > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-amber-700 font-medium">Decisions</span>
              <span className="font-bold text-amber-800">{recsDecided}/{recsTotal}</span>
            </div>
            <div className="h-1.5 rounded-full bg-amber-200/60">
              <div
                className="h-full rounded-full bg-amber-600 transition-all duration-500"
                style={{ width: `${decisionPct}%` }}
              />
            </div>
            {recsPending > 0 && (
              <p className="text-[10px] text-amber-700 mt-1.5 leading-snug">
                {recsPending} pending — will be treated as rejected
              </p>
            )}
          </div>
        )}

        {course.status === 'draft' ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold bg-emerald-700 hover:bg-emerald-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {approving ? 'Approving…' : 'Approve & start path'}
          </button>
        ) : firstStudyHref ? (
          <Link
            href={firstStudyHref}
            className="block w-full py-2.5 rounded-lg text-white text-[13px] font-semibold text-center bg-emerald-700 hover:bg-emerald-800 transition-colors"
          >
            Continue learning →
          </Link>
        ) : (
          <p className="text-xs text-gray-500 text-center py-2">
            No lessons available to study.
          </p>
        )}

        {approveError && (
          <p className="mt-2 text-xs text-red-700">{approveError}</p>
        )}
      </div>
    </div>
  );
}

function QuickLinksCard() {
  return (
    <div className="rounded-lg border border-gray-200/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick links</h3>
      </div>
      <div className="p-2">
        <Link
          href="/personalise"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5M12 3.75v16.5" />
          </svg>
          All my paths
        </Link>
        <Link
          href="/personalise/build"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Build another path
        </Link>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Path row + cards (timeline spine)
// ----------------------------------------------------------------------------

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
          <div className="flex-1 w-px bg-gray-200 mt-1" aria-hidden="true" />
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
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-semibold ring-4 ring-[#f8f9fa] shadow-sm"
      style={{ backgroundColor: 'var(--theme-primary)' }}
    >
      {index}
    </span>
  );
}

function RecommendedBadge() {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed border-amber-400 bg-white text-amber-600 text-base font-semibold ring-4 ring-[#f8f9fa]">
      +
    </span>
  );
}

function SelectedLessonCard({
  item,
  displayIndex,
  status,
  connectorBelow,
  pathId,
}: {
  item: Item;
  displayIndex: number;
  status: CourseDetail['status'];
  connectorBelow: boolean;
  pathId: string;
}) {
  const studyHref = studyHrefFor(item, pathId);
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
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 marker:text-gray-400">
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
          className="group block rounded-lg border border-gray-200/60 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 motion-reduce:hover:transform-none transition-all duration-200 cursor-pointer"
        >
          {inner}
        </Link>
      ) : (
        <div className="group rounded-lg border border-gray-200/60 bg-white shadow-sm">
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
  pathId,
}: {
  item: Item;
  status: CourseDetail['status'];
  decision: Decision;
  connectorBelow: boolean;
  onAccept: () => void;
  onReject: () => void;
  pathId: string;
}) {
  const isDraft = status === 'draft';
  const studyHref = studyHrefFor(item, pathId);
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
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 marker:text-gray-400">
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
    'rounded-lg border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/40 shadow-sm';

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
