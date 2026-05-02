-- ============================================================================
-- Part 44: Personalised Course Builder — feature flags
-- ============================================================================
-- Depends on: 001 (tenants), 002 (courses)
-- ============================================================================
-- Two governance flags that gate the Personalised Course Builder feature.
--
--   1. tenants.personalised_courses_enabled (default FALSE)
--      Per-tenant master switch. When false, the catalogue endpoint,
--      /api/courses/personalise, and all related student-facing UI must
--      return 404 (not 403) so we do not leak feature existence to tenants
--      who haven't opted in. Default false because the feature has real
--      LLM cost; tenants opt in deliberately via the tenant-settings page.
--
--   2. courses.allow_lesson_personalisation (default FALSE)
--      Per-course opt-in. A lesson is offered to the personalisation engine
--      only when its parent course has this set true. Default false so
--      existing courses do not auto-expose their lessons to a brand-new
--      cross-course assembly surface — course owners opt in per course
--      via the course-edit page.
--
-- The combined access predicate (enforced everywhere lessons are listed for
-- the personalisation catalogue and recommendation pool):
--
--   tenant.personalised_courses_enabled = true
--     AND course.allow_lesson_personalisation = true
--     AND course.published = true
--     AND lesson.published = true
--     AND course.tenant_id = lesson.tenant_id = current_tenant_id()
--
-- Both flags are real BOOLEAN columns (not entries in tenants.settings JSONB)
-- because the catalogue query joins on them and benefits from a partial index
-- on the courses-side flag.
-- ============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS personalised_courses_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.personalised_courses_enabled IS
  'Master switch for the Personalised Course Builder. When false, all '
  'personalisation endpoints and UI return 404. Default false; tenants opt '
  'in explicitly because the feature incurs LLM cost.';

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS allow_lesson_personalisation BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.courses.allow_lesson_personalisation IS
  'When true, this course''s lessons are eligible to be assembled into '
  'learner-specific personalised paths via the Personalised Course Builder. '
  'Default false; course owners opt in per course.';

-- Partial index — only opted-in courses get indexed since they're the
-- minority case and the catalogue query filters on the flag = true branch.
CREATE INDEX IF NOT EXISTS idx_courses_allow_lesson_personalisation
  ON public.courses(allow_lesson_personalisation)
  WHERE allow_lesson_personalisation = true;
