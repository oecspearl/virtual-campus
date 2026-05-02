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

export default function PersonalisedCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [decisions, setDecisions] = React.useState<Record<string, 'accepted' | 'rejected' | undefined>>({});
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
        // Pre-fill decisions from any persisted accept/reject choices.
        const initial: Record<string, 'accepted' | 'rejected'> = {};
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
      // Re-fetch so the page renders the active view.
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

  const selected = course.items
    .filter((i) => i.item_type === 'selected')
    .sort((a, b) => a.position - b.position);
  const recommended = course.items.filter((i) => i.item_type === 'recommended');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <Link href="/personalise" className="text-sm text-indigo-600 hover:underline">
          ← Back to my paths
        </Link>
        {course.status === 'draft' && (
          <p className="mt-2 text-xs uppercase tracking-wide text-amber-700">Draft — review and approve below</p>
        )}
        <h1 className="mt-2 text-2xl font-medium text-gray-900">
          {course.course_title ?? course.learner_goal}
        </h1>
        {course.course_description && (
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{course.course_description}</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          <span className="font-medium">Your goal:</span> {course.learner_goal}
        </p>
      </div>

      {/* Conflicts — surfaced first because they may block approval */}
      {course.flagged_conflicts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Conflicts to review</p>
          <ul className="mt-2 list-disc list-inside text-xs text-red-800 space-y-1">
            {course.flagged_conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Selected sequence */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-2">
          Sequenced lessons ({selected.length})
        </h2>
        {selected.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-xs text-gray-500">
            The model couldn&apos;t form a coherent sequence from the selected lessons.
            See the conflicts above.
          </div>
        ) : (
          <ol className="space-y-3">
            {selected.map((item, idx) => {
              const studyHref =
                item.lesson_id && item.course_id
                  ? `/course/${item.course_id}/lesson/${item.lesson_id}`
                  : null;
              const titleNode = (
                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                  {item.lesson_title_snapshot}
                </p>
              );
              return (
                <li key={item.id} className="rounded-lg border bg-white p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex gap-3">
                    <span className="text-xs font-medium text-gray-400 mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {studyHref ? (
                            <Link href={studyHref} className="group block">
                              {titleNode}
                            </Link>
                          ) : (
                            titleNode
                          )}
                          {item.rationale && (
                            <p className="text-xs text-gray-500 mt-1 italic">{item.rationale}</p>
                          )}
                        </div>
                        {studyHref && course.status === 'active' && (
                          <Link href={studyHref} className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-0.5">
                            Study →
                          </Link>
                        )}
                      </div>

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
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Recommendations — only meaningful in draft */}
      {course.status === 'draft' && recommended.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Recommended additions ({recommended.length})
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Decide on each before approving. Accepted items will be inserted into the sequence.
          </p>
          <ul className="space-y-2">
            {recommended.map((item) => {
              const decision = decisions[item.id];
              return (
                <li key={item.id} className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{item.lesson_title_snapshot}</p>
                  {item.rationale && (
                    <p className="text-xs text-gray-600 mt-1">{item.rationale}</p>
                  )}
                  {item.path_instructions && (
                    <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700 leading-relaxed">
                      {item.path_instructions}
                    </div>
                  )}
                  {item.path_outcomes.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-xs text-gray-700 space-y-0.5">
                      {item.path_outcomes.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisions((p) => ({ ...p, [item.id]: 'accepted' }))}
                      className={`text-xs px-3 py-1 rounded border ${
                        decision === 'accepted'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisions((p) => ({ ...p, [item.id]: 'rejected' }))}
                      className={`text-xs px-3 py-1 rounded border ${
                        decision === 'rejected'
                          ? 'bg-gray-600 text-white border-gray-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {course.flagged_gaps.length > 0 && (
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

      {course.inferred_objectives.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-900 mb-2">What you&apos;ll learn</h2>
          <ul className="rounded-lg border bg-white p-4 list-disc list-inside text-xs text-gray-700 space-y-1">
            {course.inferred_objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </section>
      )}

      {course.generated_syllabus && (
        <section>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Syllabus</h2>
          <div className="rounded-lg border bg-white p-4 prose prose-sm max-w-none">
            <ReactMarkdown>{course.generated_syllabus}</ReactMarkdown>
          </div>
        </section>
      )}

      {course.status === 'draft' && (
        <div className="rounded-lg border bg-white p-4 sticky bottom-4">
          {approveError && (
            <p className="text-xs text-red-700 mb-2">{approveError}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Approving locks the sequence and starts the path.
              {recommended.some((r) => decisions[r.id] === undefined) && (
                <> Some recommendations are still pending — they&apos;ll be treated as rejected if you approve now.</>
              )}
            </p>
            <Button onClick={approve} disabled={approving}>
              {approving ? 'Approving…' : 'Approve & start'}
            </Button>
          </div>
        </div>
      )}

      {course.approved_at && (
        <p className="text-[11px] text-gray-400">
          Approved {new Date(course.approved_at).toLocaleString()}
          {course.llm_provider && ` · Assembled by ${course.llm_provider}`}
        </p>
      )}
    </div>
  );
}
