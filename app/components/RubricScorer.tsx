"use client";

import React from "react";
import type { RubricLevel, RubricCriterion } from "@/app/components/RubricBuilder";

export type RubricScore = { criteria_id: string; score: number; comment: string };

export default function RubricScorer({ rubric, value, onChange }: { rubric: RubricCriterion[]; value: RubricScore[]; onChange: (scores: RubricScore[]) => void }) {
  const [scores, setScores] = React.useState<RubricScore[]>(value);
  const safeRubric = Array.isArray(rubric) ? rubric : [];

  React.useEffect(() => setScores(value), [value]);

  function set(criteriaId: string, score: number) {
    const existing = scores.find((s) => s.criteria_id === criteriaId);
    let next = scores;
    if (existing) next = scores.map((s) => (s.criteria_id === criteriaId ? { ...s, score } : s));
    else next = [...scores, { criteria_id: criteriaId, score, comment: "" }];
    setScores(next);
    onChange(next);
  }

  function setComment(criteriaId: string, comment: string) {
    const existing = scores.find((s) => s.criteria_id === criteriaId);
    let next = scores;
    if (existing) next = scores.map((s) => (s.criteria_id === criteriaId ? { ...s, comment } : s));
    else next = [...scores, { criteria_id: criteriaId, score: 0, comment }];
    setScores(next);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {safeRubric.map((row) => {
        // Extra safety: ensure levels is an array
        const safeLevels = Array.isArray(row?.levels) ? row.levels : [];
        
        return (
          <div key={row.id} className="rounded-md border p-3">
            <div className="mb-2 text-sm text-gray-800">
              <span>{row.criteria || 'Untitled Criteria'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {safeLevels.map((lvl: RubricLevel, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  className={`rounded-md border px-2 py-1 text-xs ${scores.find((s) => s.criteria_id === row.id)?.score === lvl.points ? "border-[#3B82F6] text-[#3B82F6]" : "border-gray-300 text-gray-700"}`}
                  onClick={() => set(row.id, lvl.points)}
                >
                  <span>{lvl.name} ({lvl.points})</span>
                </button>
              ))}
            </div>
            {safeLevels.length === 0 && (
              <div className="text-xs text-gray-500 italic">No levels defined for this criteria</div>
            )}
            <textarea
              className="mt-2 w-full rounded-md border px-2 py-1 text-xs"
              placeholder="Comment"
              value={scores.find((s) => s.criteria_id === row.id)?.comment ?? ""}
              onChange={(e) => setComment(row.id, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
