'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type {
  RubricCriterion,
  RubricLevel,
} from '@/app/components/assignment/RubricBuilder';
import type { RubricScoreSelection } from '@/app/components/assignment/RubricGrader';

/**
 * Read-only rubric breakdown — what students (and graders re-opening
 * a submission) see after grading is complete. Per criterion:
 *   - Highlighted picked level + its description
 *   - Points awarded for this criterion
 *   - Optional grader comment
 */
export default function RubricBreakdownView({
  criteria,
  scores,
}: {
  criteria: RubricCriterion[];
  scores: RubricScoreSelection[];
}) {
  const scoreByCriterion = React.useMemo(() => {
    const m = new Map<string, RubricScoreSelection>();
    for (const s of scores) m.set(s.criterion_id, s);
    return m;
  }, [scores]);

  if (!criteria || criteria.length === 0) return null;

  let total = 0;
  let max = 0;
  for (const c of criteria) {
    const safeLevels = Array.isArray(c?.levels) ? c.levels : [];
    const high = safeLevels.reduce(
      (m2, lvl) => (Number(lvl.points) > m2 ? Number(lvl.points) : m2),
      0
    );
    max += high;
    const pick = scoreByCriterion.get(c.id);
    if (pick) total += Number(pick.points || 0);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Rubric breakdown
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-bold text-gray-900">{total}</span>
          <span className="text-gray-400"> / {max}</span>
        </span>
      </div>

      {criteria.map((c) => {
        const safeLevels: RubricLevel[] = Array.isArray(c?.levels) ? c.levels : [];
        const pick = scoreByCriterion.get(c.id);
        const pickedLevel =
          pick?.level_index != null ? safeLevels[pick.level_index] : null;

        return (
          <div key={c.id} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h4 className="text-sm font-semibold text-gray-900 min-w-0 truncate">
                {c.criteria || 'Untitled criterion'}
              </h4>
              <span className="text-xs tabular-nums shrink-0 text-gray-600">
                {pick ? `${pick.points} pts` : 'Not scored'}
              </span>
            </div>

            {pickedLevel ? (
              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    icon="mdi:check-circle"
                    className="w-4 h-4 text-blue-600 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-blue-900">
                    {pickedLevel.name}
                  </span>
                  <span className="text-xs tabular-nums text-blue-700 ml-auto">
                    {pickedLevel.points} pts
                  </span>
                </div>
                {pickedLevel.description && (
                  <p className="text-xs text-blue-900/80 leading-snug">
                    {pickedLevel.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                The grader did not pick a level for this criterion.
              </div>
            )}

            {pick?.comment && (
              <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1 flex items-center gap-1">
                  <Icon
                    icon="mdi:message-text-outline"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  />
                  Grader comment
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {pick.comment}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
