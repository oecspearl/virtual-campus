-- ============================================================================
-- Part 51: Assignment rubric scoring — per-submission persistence
-- ============================================================================
-- Depends on: 003 (assignment_submissions; assignments.rubric JSONB)
-- ============================================================================
-- Assignments already carry a `rubric` JSONB column (managed by the
-- existing RubricBuilder component). Shape per row:
--   { id: string, criteria: string, levels: [{ name, description, points }] }
--
-- This migration adds the missing piece: persistent per-submission
-- scoring. When a grader picks a level for each criterion, we want to
-- store the picked level + its snapshot points + an optional
-- per-criterion comment so the rubric pane re-renders exactly as the
-- grader left it. The rubric DEFINITION stays on assignments.rubric;
-- this table only stores the SELECTIONS.
--
-- Design choices:
-- - criterion_id is a TEXT (not UUID) because the existing rubric
--   JSONB rows are keyed by string ids that aren't database FKs.
-- - Snapshotted `points` and `level_index` so a later edit to the
--   rubric definition doesn't silently change recorded grades.
-- - One row per (submission, criterion) via UNIQUE constraint.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_submission_rubric_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  submission_id UUID NOT NULL
    REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  -- Matches the `id` field of an entry in assignments.rubric JSONB.
  -- TEXT (not UUID) because those ids are author-generated strings.
  criterion_id TEXT NOT NULL,
  -- Index into the criterion's `levels` array (0-based).
  level_index INTEGER,
  -- Snapshotted points value at grading time. Decoupled from the
  -- rubric definition so a later edit doesn't change recorded grades.
  points NUMERIC,
  comment TEXT,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignment_submission_rubric_scores_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_submission_rubric_scores_unique
    UNIQUE (submission_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_rubric_scores_tenant
  ON assignment_submission_rubric_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submission_rubric_scores_submission
  ON assignment_submission_rubric_scores(submission_id);

COMMENT ON TABLE public.assignment_submission_rubric_scores IS
  'Per-criterion grader selections for a submission. Sum of points across rows is mirrored into assignment_submissions.grade. Rubric definition lives on assignments.rubric JSONB.';

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.assignment_submission_rubric_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own rubric scores" ON assignment_submission_rubric_scores;
CREATE POLICY "View own rubric scores" ON assignment_submission_rubric_scores
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      EXISTS (
        SELECT 1 FROM assignment_submissions s
        WHERE s.id = assignment_submission_rubric_scores.submission_id
          AND s.student_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
              AND users.role IN ('super_admin','tenant_admin','admin','instructor','curriculum_designer'))
    )
  );

DROP POLICY IF EXISTS "Staff manage rubric scores" ON assignment_submission_rubric_scores;
CREATE POLICY "Staff manage rubric scores" ON assignment_submission_rubric_scores
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','tenant_admin','admin','instructor','curriculum_designer'))
  );
