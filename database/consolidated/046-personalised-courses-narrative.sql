-- ============================================================================
-- Part 46: Personalised Course Builder — course-grade narrative metadata
-- ============================================================================
-- Depends on: 045 (personalised_courses, personalised_course_lessons)
-- ============================================================================
-- Phase 8 escalates the LLM's role: instead of just sequencing lessons and
-- writing a syllabus, the model now produces full course-grade artefacts so
-- the personalised path operates like an actual course.
--
-- Two columns on personalised_courses:
--
--   * course_title       — a short, learner-goal-framed name for the path
--                          (rendered as the course title in the UI)
--   * course_description — a 2–4 sentence description of who/what/outcome
--
-- Two columns on personalised_course_lessons:
--
--   * path_outcomes     — 3–5 lesson-level learning outcomes specific to the
--                         path's goal (independent of the lesson's own
--                         learning_outcomes, which are course-context-
--                         agnostic)
--   * path_instructions — a 2–4 sentence framing of how to approach this
--                         lesson within the assembled path
--
-- All four are NULLABLE / array-default-empty for additive safety: rows
-- created before migration 046 (Phase 4 → 7 paths) keep working with
-- empty narrative; the UI degrades gracefully and falls back to the
-- learner_goal / lesson title for display.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.personalised_courses
  ADD COLUMN IF NOT EXISTS course_title       TEXT,
  ADD COLUMN IF NOT EXISTS course_description TEXT;

COMMENT ON COLUMN public.personalised_courses.course_title IS
  'LLM-generated course-grade title for the path, framed in terms of the learner_goal. Nullable for paths created before migration 046; UI falls back to learner_goal when null.';
COMMENT ON COLUMN public.personalised_courses.course_description IS
  'LLM-generated 2-4 sentence description of the path. Nullable for paths created before migration 046.';

ALTER TABLE public.personalised_course_lessons
  ADD COLUMN IF NOT EXISTS path_outcomes     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS path_instructions TEXT;

COMMENT ON COLUMN public.personalised_course_lessons.path_outcomes IS
  'LLM-generated learning outcomes specific to this lesson''s role in the path. Independent of lessons.learning_outcomes, which are course-context-agnostic.';
COMMENT ON COLUMN public.personalised_course_lessons.path_instructions IS
  'LLM-generated 2-4 sentence framing of how the learner should approach this lesson within the path.';

NOTIFY pgrst, 'reload schema';
