"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SubmissionViewer from "@/app/components/assignment/SubmissionViewer";
import RubricGrader, {
  type RubricCriterion,
  type RubricScoreSelection,
} from "@/app/components/assignment/RubricGrader";

interface GradingPanelProps {
  assignmentId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submission: any;
  /** Assignment's max points; defaults to 100 for back-compat. */
  maxPoints?: number;
  /**
   * Called after a successful save with the patch to apply locally.
   * The parent decides whether to refetch, optimistic-update, or
   * advance to the next submission.
   */
  onSaved?: (patch: { grade: number; feedback: string; status: string }) => void;
  /** Legacy callback retained for callers that still pass it. */
  onGraded?: () => void;
}

export default function GradingPanel({
  assignmentId,
  submission,
  maxPoints = 100,
  onSaved,
  onGraded,
}: GradingPanelProps) {
  const [feedback, setFeedback] = useState<string>(submission?.feedback ?? "");
  const [grade, setGrade] = useState<number | ''>(submission?.grade ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Rubric state. When the assignment has a rubric, the rubric drives
  // the grade total; the manual grade input is hidden. The rubric
  // definition lives on assignments.rubric (JSONB) — fetched via the
  // assignment endpoint. Per-criterion selections are persisted in
  // assignment_submission_rubric_scores via a dedicated endpoint.
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [rubricScores, setRubricScores] = useState<RubricScoreSelection[]>([]);
  const [rubricLoading, setRubricLoading] = useState(true);

  const gradeInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form when the active submission changes.
  useEffect(() => {
    setFeedback(submission?.feedback ?? "");
    setGrade(submission?.grade ?? '');
    setError(null);
    setSaved(false);
  }, [submission?.id, submission?.grade, submission?.feedback]);

  // Load the rubric definition (from assignments.rubric JSONB via the
  // assignment endpoint), plus the submission-specific scores whenever
  // the active submission changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRubricLoading(true);
      try {
        const [assignmentRes, scoresRes] = await Promise.all([
          fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`, {
            cache: 'no-store',
          }),
          submission?.id
            ? fetch(
                `/api/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(
                  submission.id
                )}/rubric-scores`,
                { cache: 'no-store' }
              )
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const assignmentData = assignmentRes.ok ? await assignmentRes.json() : null;
        const scoresData =
          scoresRes && scoresRes.ok ? await scoresRes.json() : null;
        const rawRubric = assignmentData?.rubric;
        // The endpoint already parses string JSON, but be defensive.
        let parsedRubric: RubricCriterion[] = [];
        if (Array.isArray(rawRubric)) {
          parsedRubric = rawRubric as RubricCriterion[];
        } else if (typeof rawRubric === 'string' && rawRubric.trim()) {
          try {
            const parsed = JSON.parse(rawRubric);
            if (Array.isArray(parsed)) parsedRubric = parsed as RubricCriterion[];
          } catch {
            parsedRubric = [];
          }
        }
        setRubricCriteria(parsedRubric);
        setRubricScores(
          Array.isArray(scoresData?.scores) ? scoresData.scores : []
        );
      } catch (e) {
        console.error('Rubric load error:', e);
      } finally {
        if (!cancelled) setRubricLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, submission?.id]);

  const useRubric = !rubricLoading && rubricCriteria.length > 0;

  // Focus the grade input when in manual mode and the submission changes.
  useEffect(() => {
    if (useRubric) return;
    const t = window.setTimeout(() => gradeInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [submission?.id, useRubric]);

  const rubricTotal = useMemo(
    () => rubricScores.reduce((sum, s) => sum + Number(s.points || 0), 0),
    [rubricScores]
  );

  const submitRubric = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(
          String(submission.id)
        )}/rubric-scores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scores: rubricScores, feedback }),
        }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const total = Number(data.total ?? rubricTotal);
        setSaved(true);
        onSaved?.({ grade: total, feedback, status: 'graded' });
        onGraded?.();
        window.setTimeout(() => setSaved(false), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to save rubric');
      }
    } catch {
      setError('Failed to save rubric. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submission?.id, rubricScores, feedback, rubricTotal, onGraded, onSaved]);

  const submitManualGrade = useCallback(async () => {
    if (grade === '' || grade === null || grade === undefined) {
      setError('Please enter a grade');
      return;
    }
    const numericGrade = Number(grade);
    if (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > maxPoints) {
      setError(`Grade must be between 0 and ${maxPoints}`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(
          String(submission.id)
        )}/grade`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback, grade: numericGrade }),
        }
      );

      if (res.ok) {
        setSaved(true);
        onSaved?.({ grade: numericGrade, feedback, status: 'graded' });
        onGraded?.();
        window.setTimeout(() => setSaved(false), 1500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to save grade');
      }
    } catch {
      setError('Failed to save grade. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submission?.id, grade, feedback, maxPoints, onGraded, onSaved]);

  const handleSave = useRubric ? submitRubric : submitManualGrade;

  // Cmd/Ctrl+Enter saves and advances. Wired via keydown on the form so
  // the shortcut works no matter which field has focus.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const isLate = (() => {
    const due = submission?.assignment?.due_date;
    if (!due || !submission?.submitted_at) return false;
    return new Date(submission.submitted_at) > new Date(due);
  })();

  return (
    <div className="space-y-6" onKeyDown={handleFormKeyDown}>
      {/* Submission Viewer Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-slate-700 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Icon icon="mdi:file-document" className="w-5 h-5" aria-hidden="true" />
            Student Submission
          </h3>
          {submission?.submitted_at && (
            <div className="text-[11px] text-slate-200 flex items-center gap-2">
              <span>
                Submitted {new Date(submission.submitted_at).toLocaleString()}
              </span>
              {isLate && (
                <span className="inline-flex items-center gap-1 text-amber-200">
                  <Icon icon="mdi:alert" className="w-3.5 h-3.5" aria-hidden="true" />
                  Late
                </span>
              )}
            </div>
          )}
        </div>
        <div className="p-6">
          <SubmissionViewer submission={submission} />
        </div>
      </div>

      {/* Grading Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-slate-700 px-6 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Icon icon="mdi:clipboard-check" className="w-5 h-5" aria-hidden="true" />
            {useRubric ? 'Rubric' : 'Grade & Feedback'}
          </h3>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div
              className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3"
              role="alert"
            >
              <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold text-red-900">Error</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Rubric mode */}
          {useRubric && (
            <RubricGrader
              criteria={rubricCriteria}
              initialScores={rubricScores}
              onChange={setRubricScores}
              disabled={loading}
            />
          )}

          {/* Manual grade input — only when there's no rubric */}
          {!useRubric && !rubricLoading && (
            <div>
              <label
                htmlFor="assignment-grade"
                className="block text-sm font-semibold text-gray-900 mb-2"
              >
                Grade <span className="text-red-500">*</span>
                <span className="ml-2 font-normal text-gray-500">(0–{maxPoints})</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  id="assignment-grade"
                  ref={gradeInputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold tabular-nums focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={grade}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGrade(val === '' ? '' : Number(val));
                    setError(null);
                  }}
                  min={0}
                  max={maxPoints}
                  placeholder={`0–${maxPoints}`}
                  aria-describedby="assignment-grade-help"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold tabular-nums">
                  /{maxPoints}
                </div>
              </div>
              <div
                id="assignment-grade-help"
                className="mt-1.5 text-[11px] text-gray-500 flex items-center justify-between"
              >
                <span>Step size: 0.5 — type any decimal</span>
                {typeof grade === 'number' && grade > 0 && (
                  <span className="tabular-nums">
                    {((grade / maxPoints) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Feedback Input — shared between rubric and manual modes */}
          <div>
            <label
              htmlFor="assignment-feedback"
              className="block text-sm font-semibold text-gray-900 mb-2"
            >
              Feedback <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="assignment-feedback"
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback for the student…"
            />
            <div className="mt-1.5 text-[11px] text-gray-500">
              {feedback.length} characters
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 flex-wrap">
            <button
              type="button"
              className="bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-white font-medium rounded-md transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={loading}
              aria-keyshortcuts="Control+Enter Meta+Enter"
            >
              {loading ? (
                <>
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              ) : saved ? (
                <>
                  <Icon icon="mdi:check" className="w-4 h-4" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Icon icon="mdi:check-circle" className="w-4 h-4" aria-hidden="true" />
                  <span>{useRubric ? `Save rubric (${rubricTotal} pts)` : 'Save & next'}</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-gray-500 inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">⌘↵</kbd>
              <span>or</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">Ctrl+↵</kbd>
              <span>to save</span>
            </span>

            <span className="ml-auto text-[11px] text-gray-500">
              <Icon icon="mdi:eye" className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
              Visible to the student after save
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
