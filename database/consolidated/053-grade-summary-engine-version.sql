-- ============================================================================
-- Part 53: course_grade_summary engine version tracking
-- ============================================================================
-- Depends on: 047 (course_grade_summary)
-- ============================================================================
-- Cached summaries become silently wrong every time the aggregation
-- engine changes its math (e.g. adding orphan rebucketing in 5629c22,
-- or adding the synthetic "Uncategorised" breakdown row in this PR).
-- Migration 052 wipes the cache once; this migration makes the cache
-- self-healing across future engine changes.
--
-- Adds a `computed_version` column. The engine writes a hardcoded
-- version string on every recompute; the read-side checks it. When
-- the cache's version doesn't match the current engine's, it
-- recomputes — same path as the "no row" fallback, just version-aware.
--
-- Existing rows get NULL, which the read-side treats as stale and
-- triggers a recompute. So this migration alone forces a fresh
-- evaluation for every student on next read; no separate cache wipe
-- needed.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.course_grade_summary
  ADD COLUMN IF NOT EXISTS computed_version TEXT;

CREATE INDEX IF NOT EXISTS idx_course_grade_summary_version
  ON course_grade_summary(computed_version);

COMMENT ON COLUMN public.course_grade_summary.computed_version IS
  'Engine version string at the time the row was last recomputed. Read-side compares this against the current ENGINE_VERSION constant; mismatches trigger an on-demand recompute.';
