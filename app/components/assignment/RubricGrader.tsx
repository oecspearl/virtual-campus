'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import type {
  RubricCriterion,
  RubricLevel,
} from '@/app/components/assignment/RubricBuilder';

export type { RubricCriterion, RubricLevel };

export interface RubricScoreSelection {
  criterion_id: string;
  level_index: number | null;
  points: number;
  comment?: string | null;
}

interface RubricGraderProps {
  /** Rubric definition from assignments.rubric JSONB. */
  criteria: RubricCriterion[];
  /** Saved scores from the server. Used to seed initial selections. */
  initialScores: RubricScoreSelection[];
  /** Called whenever the grader's selections change. Parent uses this
   *  to drive the running total + the assignment grade input. */
  onChange: (scores: RubricScoreSelection[]) => void;
  disabled?: boolean;
  /** Assignment's max points. When provided AND the rubric's total
   *  max differs, the rubric total is shown scaled into this range
   *  (e.g. "Total: 60/90 → saves as 13.3 of 20"). */
  assignmentMax?: number;
}

/**
 * Per-criterion level picker with optional inline comment.
 *
 * Reads the existing rubric JSONB shape ({ id, criteria, levels })
 * authored by RubricBuilder. Each criterion renders as a row of
 * level cells; the picked level + its snapshotted points value are
 * emitted via onChange.
 */
export default function RubricGrader({
  criteria,
  initialScores,
  onChange,
  disabled,
  assignmentMax,
}: RubricGraderProps) {
  const [selectionByCriterion, setSelectionByCriterion] = useState<
    Record<string, RubricScoreSelection>
  >(() => {
    const map: Record<string, RubricScoreSelection> = {};
    for (const s of initialScores) map[s.criterion_id] = s;
    return map;
  });

  // Re-seed when the active submission changes (initialScores prop swap).
  useEffect(() => {
    const map: Record<string, RubricScoreSelection> = {};
    for (const s of initialScores) map[s.criterion_id] = s;
    setSelectionByCriterion(map);
  }, [initialScores]);

  const total = useMemo(() => {
    let sum = 0;
    for (const c of criteria) {
      const pick = selectionByCriterion[c.id];
      if (pick) sum += pick.points;
    }
    return sum;
  }, [selectionByCriterion, criteria]);

  const maxTotal = useMemo(() => {
    let max = 0;
    for (const c of criteria) {
      const safeLevels: RubricLevel[] = Array.isArray(c?.levels) ? c.levels : [];
      const high = safeLevels.reduce(
        (m, lvl) => (Number(lvl.points) > m ? Number(lvl.points) : m),
        0
      );
      max += high;
    }
    return max;
  }, [criteria]);

  const emit = (next: Record<string, RubricScoreSelection>) => {
    setSelectionByCriterion(next);
    onChange(Object.values(next));
  };

  const pickLevel = (criterion: RubricCriterion, levelIndex: number) => {
    if (disabled) return;
    const lvl = criterion.levels[levelIndex];
    if (!lvl) return;
    const next: Record<string, RubricScoreSelection> = {
      ...selectionByCriterion,
      [criterion.id]: {
        criterion_id: criterion.id,
        level_index: levelIndex,
        points: Number(lvl.points),
        comment: selectionByCriterion[criterion.id]?.comment ?? null,
      },
    };
    emit(next);
  };

  const setComment = (criterionId: string, comment: string) => {
    const existing =
      selectionByCriterion[criterionId] ??
      ({
        criterion_id: criterionId,
        level_index: null,
        points: 0,
        comment: '',
      } as RubricScoreSelection);
    const next: Record<string, RubricScoreSelection> = {
      ...selectionByCriterion,
      [criterionId]: { ...existing, comment },
    };
    emit(next);
  };

  if (criteria.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        This rubric has no criteria yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 gap-3">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Rubric scoring
        </span>
        <div className="text-sm tabular-nums text-right">
          <div>
            <span className="font-bold text-gray-900">{total}</span>
            <span className="text-gray-400"> / {maxTotal}</span>
          </div>
          {assignmentMax !== undefined &&
            maxTotal > 0 &&
            assignmentMax !== maxTotal && (
              <div className="text-[11px] text-gray-500">
                saves as{' '}
                <span className="font-semibold text-gray-700">
                  {((total / maxTotal) * assignmentMax).toFixed(1)}
                </span>
                <span className="text-gray-400"> / {assignmentMax}</span>
              </div>
            )}
        </div>
      </div>

      <div className="space-y-4">
        {criteria.map((c) => {
          const safeLevels: RubricLevel[] = Array.isArray(c?.levels)
            ? c.levels
            : [];
          const pick = selectionByCriterion[c.id];
          return (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-2 gap-3">
                <h4 className="text-sm font-semibold text-gray-900 min-w-0 truncate">
                  {c.criteria || 'Untitled criterion'}
                </h4>
                <span className="text-xs tabular-nums shrink-0 text-gray-600">
                  {pick ? `${pick.points} pts` : '—'}
                </span>
              </div>

              {safeLevels.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  No levels defined for this criterion.
                </div>
              ) : (
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${safeLevels.length}, minmax(0, 1fr))`,
                  }}
                  role="radiogroup"
                  aria-label={`Levels for ${c.criteria || 'criterion'}`}
                >
                  {safeLevels.map((lvl, idx) => {
                    const selected = pick?.level_index === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => pickLevel(c, idx)}
                        className={`text-left p-2 rounded border transition-colors ${
                          selected
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                          <span className="text-xs font-semibold truncate">
                            {lvl.name}
                          </span>
                          <span className="text-[10px] tabular-nums shrink-0">
                            {lvl.points}
                          </span>
                        </div>
                        {lvl.description && (
                          <p
                            className={`text-[11px] leading-snug line-clamp-3 ${
                              selected ? 'text-slate-200' : 'text-gray-500'
                            }`}
                          >
                            {lvl.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <details className="mt-2 group">
                <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-700 select-none inline-flex items-center gap-1">
                  <Icon
                    icon="mdi:chevron-right"
                    className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                  {pick?.comment ? 'Edit comment' : 'Add comment'}
                </summary>
                <textarea
                  value={pick?.comment ?? ''}
                  onChange={(e) => setComment(c.id, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder="Optional notes on this criterion…"
                  className="mt-1.5 w-full text-xs border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
