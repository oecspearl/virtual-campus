-- ============================================================================
-- Part 47: Gradebook aggregation — hierarchical categories, drop rules,
--          letter-grade scales, audit history
-- ============================================================================
-- Depends on: 003 (course_grade_items, course_grades), 011 (RLS scaffolding)
-- ============================================================================
-- The 003 gradebook is flat: a free-text `category` string on each grade
-- item, a single `total_points` per course, and one weighted-average roll-up
-- at best. To approach Moodle parity we need:
--
--   1. Hierarchical categories (a category can contain other categories or
--      grade items), each with its own aggregation strategy.
--   2. A canonical, FK-backed `category_id` on `course_grade_items`
--      replacing the free-text `category` column over time.
--   3. Per-course letter-grade scales (boundaries → letter labels).
--   4. An audit trail of grade changes for compliance / regrade disputes.
--
-- All changes are additive and idempotent. The free-text `category` column
-- on `course_grade_items` stays in place for now; new code reads
-- `category_id` and falls back to `category` when null. A follow-up
-- migration can drop the legacy column once backfill is complete.
-- ============================================================================

-- ─── Course grade categories ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_grade_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES course_grade_categories(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,

  -- Aggregation strategy applied to this category's children (sub-categories
  -- + grade items). Mirrors Moodle's strategies; we ship the high-leverage
  -- subset first.
  --   mean                  — unweighted average of child percentages
  --   weighted_mean         — weighted average; weights from child.weight
  --   simple_weighted_mean  — weighted by max_points instead of explicit weight
  --   sum                   — sum of points (Moodle "natural")
  --   max                   — best score wins
  --   min                   — worst score wins
  --   median                — 50th percentile
  aggregation VARCHAR NOT NULL DEFAULT 'weighted_mean'
    CHECK (aggregation IN (
      'mean','weighted_mean','simple_weighted_mean','sum','max','min','median'
    )),

  -- Drop-N-lowest / drop-N-highest are applied AFTER the child set is built,
  -- BEFORE aggregation. Extra-credit children are excluded from drop counts.
  drop_lowest INTEGER NOT NULL DEFAULT 0 CHECK (drop_lowest >= 0),
  drop_highest INTEGER NOT NULL DEFAULT 0 CHECK (drop_highest >= 0),
  keep_highest INTEGER CHECK (keep_highest IS NULL OR keep_highest > 0),

  -- Weight of THIS category within its parent. Only meaningful when the
  -- parent uses a weighted strategy. NULL = "auto" (parent treats it as 1.0).
  weight NUMERIC,

  -- Extra-credit categories add to the parent total without being included
  -- in the divisor (matches Moodle's "extra credit" flag).
  extra_credit BOOLEAN NOT NULL DEFAULT false,

  -- Hidden categories are computed but not shown to students. Useful for
  -- staging items before release.
  hidden BOOLEAN NOT NULL DEFAULT false,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_grade_categories_pkey PRIMARY KEY (id),
  CONSTRAINT course_grade_categories_no_self_parent CHECK (id <> parent_id),
  CONSTRAINT course_grade_categories_unique_name UNIQUE (course_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_course_grade_categories_tenant
  ON course_grade_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_categories_course
  ON course_grade_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_categories_parent
  ON course_grade_categories(parent_id);

COMMENT ON TABLE public.course_grade_categories IS
  'Hierarchical gradebook categories. Each course has at least a root category (parent_id NULL); categories may nest arbitrarily deep. Aggregation strategy + drop rules apply to the immediate children of a category.';
COMMENT ON COLUMN public.course_grade_categories.aggregation IS
  'How child rows roll up: mean, weighted_mean (default), simple_weighted_mean, sum, max, min, median.';
COMMENT ON COLUMN public.course_grade_categories.weight IS
  'Weight of this category in its parent. Used only when the parent aggregation is weighted_mean. NULL is treated as 1.0.';
COMMENT ON COLUMN public.course_grade_categories.extra_credit IS
  'When true, this category contributes to the parent total but is not counted in the divisor.';

-- ─── Evolve course_grade_items ──────────────────────────────────────────────

ALTER TABLE public.course_grade_items
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES course_grade_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extra_credit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_course_grade_items_category
  ON course_grade_items(category_id);

COMMENT ON COLUMN public.course_grade_items.category_id IS
  'FK to course_grade_categories. New code reads this; legacy `category` text column is kept for backward compatibility until backfill completes.';
COMMENT ON COLUMN public.course_grade_items.extra_credit IS
  'Adds to the category total without entering the divisor.';
COMMENT ON COLUMN public.course_grade_items.locked IS
  'Locked items cannot be edited or have grades changed (used to freeze grades after a course closes).';

-- ─── Letter-grade scales ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_grade_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  letter VARCHAR(8) NOT NULL,
  -- Inclusive lower bound. e.g. 90.0 means "90% and above earns this letter".
  min_percentage NUMERIC NOT NULL CHECK (min_percentage >= 0 AND min_percentage <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_grade_letters_pkey PRIMARY KEY (id),
  CONSTRAINT course_grade_letters_unique UNIQUE (course_id, letter)
);

CREATE INDEX IF NOT EXISTS idx_course_grade_letters_tenant
  ON course_grade_letters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_letters_course
  ON course_grade_letters(course_id);

COMMENT ON TABLE public.course_grade_letters IS
  'Per-course letter-grade scale. Letter assigned to the highest matching min_percentage band. Empty table = no letter grades for that course.';

-- ─── Audit history ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_grade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  course_grade_id UUID NOT NULL REFERENCES course_grades(id) ON DELETE CASCADE,
  previous_score NUMERIC,
  new_score NUMERIC,
  previous_feedback TEXT,
  new_feedback TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  CONSTRAINT course_grade_history_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_course_grade_history_tenant
  ON course_grade_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_history_grade
  ON course_grade_history(course_grade_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_history_changed_at
  ON course_grade_history(changed_at DESC);

COMMENT ON TABLE public.course_grade_history IS
  'Append-only audit trail of grade edits. Written by an AFTER UPDATE trigger on course_grades.';

-- ─── Grade-history trigger ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_course_grade_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip when nothing meaningful changed.
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.feedback IS DISTINCT FROM OLD.feedback THEN
    INSERT INTO public.course_grade_history (
      tenant_id, course_grade_id,
      previous_score, new_score,
      previous_feedback, new_feedback,
      changed_by, changed_at
    ) VALUES (
      NEW.tenant_id, NEW.id,
      OLD.score, NEW.score,
      OLD.feedback, NEW.feedback,
      NEW.graded_by, NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_course_grades_audit ON public.course_grades;
CREATE TRIGGER trg_course_grades_audit
  AFTER UPDATE ON public.course_grades
  FOR EACH ROW EXECUTE FUNCTION public.record_course_grade_change();

-- ─── Cached course-grade summary ────────────────────────────────────────────
-- Aggregated grades are expensive to compute on read once a course has many
-- categories and items. We cache the rolled-up result per (course, student)
-- and recompute on grade change. The aggregation engine writes to this
-- table; readers select from it directly.

CREATE TABLE IF NOT EXISTS public.course_grade_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The final rolled-up percentage (0..100, may exceed 100 with extra credit).
  percentage NUMERIC,
  -- Letter assigned from course_grade_letters, NULL when no scale defined.
  letter VARCHAR(8),
  -- Per-category breakdown for fast dashboard rendering.
  -- Shape: [{ category_id, name, percentage, points, max_points }]
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_grade_summary_pkey PRIMARY KEY (id),
  CONSTRAINT course_grade_summary_unique UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_grade_summary_tenant
  ON course_grade_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_summary_course
  ON course_grade_summary(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_summary_student
  ON course_grade_summary(student_id);

COMMENT ON TABLE public.course_grade_summary IS
  'Cached, recomputed-on-write rollup of a student''s grade in a course. The aggregation engine maintains this; never write here from app code.';

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.course_grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_grade_letters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_grade_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_grade_summary    ENABLE ROW LEVEL SECURITY;

-- Categories: visible tenant-wide, manageable by staff (mirrors course_grade_items).
DROP POLICY IF EXISTS "View grade categories" ON course_grade_categories;
CREATE POLICY "View grade categories" ON course_grade_categories
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff manage grade categories" ON course_grade_categories;
CREATE POLICY "Staff manage grade categories" ON course_grade_categories
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','tenant_admin','admin','instructor'))
  );

-- Letter scales: same pattern.
DROP POLICY IF EXISTS "View grade letters" ON course_grade_letters;
CREATE POLICY "View grade letters" ON course_grade_letters
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Staff manage grade letters" ON course_grade_letters;
CREATE POLICY "Staff manage grade letters" ON course_grade_letters
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','tenant_admin','admin','instructor'))
  );

-- History: students see own, staff see all.
DROP POLICY IF EXISTS "View own grade history" ON course_grade_history;
CREATE POLICY "View own grade history" ON course_grade_history
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      EXISTS (SELECT 1 FROM course_grades cg
              WHERE cg.id = course_grade_history.course_grade_id
                AND cg.student_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
              AND users.role IN ('super_admin','tenant_admin','admin','instructor'))
    )
  );

-- Summary: students see own, staff see all.
DROP POLICY IF EXISTS "View own grade summary" ON course_grade_summary;
CREATE POLICY "View own grade summary" ON course_grade_summary
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      student_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
              AND users.role IN ('super_admin','tenant_admin','admin','instructor'))
    )
  );

DROP POLICY IF EXISTS "Staff manage grade summary" ON course_grade_summary;
CREATE POLICY "Staff manage grade summary" ON course_grade_summary
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','tenant_admin','admin','instructor'))
  );
