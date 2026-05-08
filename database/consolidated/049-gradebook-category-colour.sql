-- ============================================================================
-- Part 49: Gradebook category display colour
-- ============================================================================
-- Depends on: 047 (course_grade_categories)
-- ============================================================================
-- Adds an optional display_color column to course_grade_categories so staff
-- can colour-code categories (e.g. blue for Quizzes, green for Final).
-- The colour propagates to per-category breakdown rows on the student
-- gradebook and to the category tree on the staff page.
--
-- Stored as a CSS hex string ("#RRGGBB"). NULL means "fall back to the
-- scale-driven colour tier", preserving today's behaviour for any
-- category that doesn't set one.
-- ============================================================================

ALTER TABLE public.course_grade_categories
  ADD COLUMN IF NOT EXISTS display_color VARCHAR(7);

ALTER TABLE public.course_grade_categories
  DROP CONSTRAINT IF EXISTS course_grade_categories_display_color_format;

ALTER TABLE public.course_grade_categories
  ADD CONSTRAINT course_grade_categories_display_color_format
    CHECK (display_color IS NULL OR display_color ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN public.course_grade_categories.display_color IS
  'Optional CSS hex colour ("#RRGGBB") used to badge this category in the breakdown UI. NULL falls back to the scale-driven tier.';
