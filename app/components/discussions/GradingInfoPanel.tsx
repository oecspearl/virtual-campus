'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRubricCriterion = any;

export interface GradingInfoPanelProps {
  /** Free-text grading criteria description. */
  gradingCriteria?: string;
  /**
   * Rubric criteria. The shape is intentionally loose: historic rows may
   * store a flat `{ points, description }` pair instead of a `levels`
   * array, and we gracefully fall back to building a single "Full Credit"
   * level for those.
   */
  rubric?: RawRubricCriterion[];
  /** Total possible points — shown in the totals row. */
  totalPoints?: number;
  /** Minimum number of replies a student must post. */
  minReplies?: number;
  /** Minimum words per post. */
  minWords?: number;
  /** Button label — defaults to "Grading Information". */
  label?: string;
}

/**
 * Student-facing, collapsible grading information display for a graded
 * discussion (or any activity with the same fields). Owns its own
 * open/closed state — there's no reason for the parent to care.
 *
 * This is read-only. For editing the rubric, use InlineRubricBuilder.
 */
export default function GradingInfoPanel({
  gradingCriteria,
  rubric,
  totalPoints,
  minReplies,
  minWords,
  label = 'Grading Information',
}: GradingInfoPanelProps) {
  const [open, setOpen] = useState(false);

  const hasRubric = Array.isArray(rubric) && rubric.length > 0;
  const hasRequirements = !!(minReplies || minWords);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        aria-expanded={open}
      >
        <Icon icon="material-symbols:grading" className="w-5 h-5" />
        {label}
        <Icon
          icon={open ? 'material-symbols:expand-less' : 'material-symbols:expand-more'}
          className="w-5 h-5"
        />
      </button>

      {open && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
          {gradingCriteria && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Grading Criteria:</p>
              <p className="text-sm text-green-700">{gradingCriteria}</p>
            </div>
          )}

          {hasRubric && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-green-800 mb-3">Scoring Rubric:</p>
              <div className="space-y-4">
                {rubric!.map((criterion: RawRubricCriterion, index: number) => {
                  const criteriaName =
                    criterion.criteria ||
                    criterion.criterion ||
                    criterion.name ||
                    `Criterion ${index + 1}`;
                  const levels = criterion.levels || [
                    {
                      name: 'Full Credit',
                      points: criterion.points || criterion.maxPoints || 0,
                      description: criterion.description || '',
                    },
                  ];
                  const maxPoints =
                    levels.length > 0
                      ? Math.max(...levels.map((l: { points?: number }) => l.points || 0))
                      : 0;

                  return (
                    <div
                      key={criterion.id || index}
                      className="bg-white rounded-lg border border-green-200 overflow-hidden"
                    >
                      <div className="bg-green-100 px-4 py-2 flex items-center justify-between">
                        <span className="font-medium text-green-800">{criteriaName}</span>
                        <span className="text-sm text-green-700">Max: {maxPoints} pts</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-gray-700 w-32">
                                Level
                              </th>
                              <th className="text-center px-4 py-2 font-medium text-gray-700 w-20">
                                Points
                              </th>
                              <th className="text-left px-4 py-2 font-medium text-gray-700">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {levels.map(
                              (
                                level: {
                                  name?: string;
                                  points?: number;
                                  description?: string;
                                },
                                levelIdx: number
                              ) => (
                                <tr key={levelIdx} className="border-t border-gray-100">
                                  <td className="px-4 py-2 text-gray-800 font-medium">
                                    {level.name || `Level ${levelIdx + 1}`}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <span className="inline-flex items-center justify-center w-10 h-6 rounded bg-green-100 text-green-800 font-medium">
                                      {level.points}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">
                                    {level.description || '-'}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {typeof totalPoints === 'number' && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-800">Total Possible Points:</span>
                    <span className="font-bold text-green-900">{totalPoints} pts</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {hasRequirements && (
            <div className="border-t border-green-200 pt-3 mt-3">
              <p className="text-sm font-semibold text-green-800 mb-2">Requirements:</p>
              <div className="flex flex-wrap gap-4 text-sm text-green-700">
                {minReplies && minReplies > 0 && (
                  <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-green-200">
                    <Icon icon="material-symbols:chat" className="w-4 h-4 text-green-600" />
                    Minimum replies: <strong>{minReplies}</strong>
                  </span>
                )}
                {minWords && minWords > 0 && (
                  <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-green-200">
                    <Icon icon="material-symbols:text-fields" className="w-4 h-4 text-green-600" />
                    Minimum words: <strong>{minWords}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
