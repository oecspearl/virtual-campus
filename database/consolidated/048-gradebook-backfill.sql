-- ============================================================================
-- Part 48: Gradebook backfill — populate course_grade_categories from the
--          legacy free-text `category` column on course_grade_items
-- ============================================================================
-- Depends on: 047 (course_grade_categories, course_grade_items.category_id)
-- ============================================================================
-- Migration 047 added a hierarchical category model but left existing items
-- pointing at the legacy `category` text column. This migration synthesises
-- a category tree per course:
--
--   Course total (root, parent_id NULL, aggregation 'weighted_mean')
--   ├── Quizzes        (sub-category, mean)
--   ├── Assignments    (sub-category, mean)
--   └── Discussions    (sub-category, mean)   ← only created if items exist
--
-- and points each `course_grade_items` row at the appropriate sub-category
-- via `category_id`. The legacy `category` text column is untouched so a
-- rollback is just `UPDATE course_grade_items SET category_id = NULL`.
--
-- Idempotent: rows that already have `category_id` set are skipped, and
-- the unique (course_id, parent_id, name) constraint prevents duplicate
-- category rows on re-run.
-- ============================================================================

DO $$
DECLARE
  v_course RECORD;
  v_legacy_cat TEXT;
  v_root_id UUID;
  v_sub_id UUID;
BEGIN
  FOR v_course IN
    SELECT DISTINCT course_id, tenant_id
    FROM public.course_grade_items
    WHERE category_id IS NULL
  LOOP
    -- Reuse an existing root if a previous backfill run already created one.
    SELECT id INTO v_root_id
    FROM public.course_grade_categories
    WHERE course_id = v_course.course_id
      AND parent_id IS NULL
      AND name = 'Course total'
    LIMIT 1;

    IF v_root_id IS NULL THEN
      INSERT INTO public.course_grade_categories
        (tenant_id, course_id, parent_id, name, aggregation, sort_order)
      VALUES
        (v_course.tenant_id, v_course.course_id, NULL,
         'Course total', 'weighted_mean', 0)
      RETURNING id INTO v_root_id;
    END IF;

    -- One sub-category per distinct legacy `category` value in this course.
    FOR v_legacy_cat IN
      SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorised')
      FROM public.course_grade_items
      WHERE course_id = v_course.course_id
        AND category_id IS NULL
    LOOP
      SELECT id INTO v_sub_id
      FROM public.course_grade_categories
      WHERE course_id = v_course.course_id
        AND parent_id = v_root_id
        AND name = v_legacy_cat
      LIMIT 1;

      IF v_sub_id IS NULL THEN
        INSERT INTO public.course_grade_categories
          (tenant_id, course_id, parent_id, name, aggregation, sort_order)
        VALUES
          (v_course.tenant_id, v_course.course_id, v_root_id,
           v_legacy_cat, 'mean', 0)
        RETURNING id INTO v_sub_id;
      END IF;

      UPDATE public.course_grade_items
      SET category_id = v_sub_id,
          updated_at = NOW()
      WHERE course_id = v_course.course_id
        AND category_id IS NULL
        AND COALESCE(NULLIF(TRIM(category), ''), 'Uncategorised') = v_legacy_cat;
    END LOOP;
  END LOOP;
END $$;

-- Sanity check: every active item now has a category_id.
-- The aggregation engine still works without it (synthetic root), but
-- backfilling lets the breakdown UI show meaningful labels immediately.
DO $$
DECLARE
  v_orphaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphaned
  FROM public.course_grade_items
  WHERE is_active = true AND category_id IS NULL;
  IF v_orphaned > 0 THEN
    RAISE NOTICE 'Backfill finished but % active grade items still have NULL category_id; the aggregation engine will treat them as belonging to a synthetic root.', v_orphaned;
  END IF;
END $$;
