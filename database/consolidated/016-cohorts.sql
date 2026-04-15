-- ============================================================================
-- Part 16: Cohort System
-- ============================================================================
-- Extends the existing `classes` table into a full cohort system.
-- Adds cohort-scoped discussions, announcements, and content overrides.
-- The `classes` table already has FKs from: enrollments.class_id,
-- assignments.class_id, attendance.class_id, grade_items.class_id
-- ============================================================================

-- ============================================================================
-- A) EXTEND classes TABLE WITH COHORT FIELDS
-- ============================================================================

ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS enrollment_start DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS enrollment_end DATE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming'
  CHECK (status IN ('upcoming', 'active', 'completed', 'archived'));
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Indexes for cohort queries
CREATE INDEX IF NOT EXISTS idx_classes_course_status ON classes(course_id, status);
CREATE INDEX IF NOT EXISTS idx_classes_course_default ON classes(course_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_classes_dates ON classes(start_date, end_date);

-- ============================================================================
-- B) ADD cohort_id TO DISCUSSIONS & ANNOUNCEMENTS (nullable = course-wide)
-- ============================================================================

ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_course_discussions_cohort ON course_discussions(cohort_id) WHERE cohort_id IS NOT NULL;

ALTER TABLE course_announcements ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_course_announcements_cohort ON course_announcements(cohort_id) WHERE cohort_id IS NOT NULL;

-- ============================================================================
-- C) ADD cohort_id TO VIDEO CONFERENCES
-- ============================================================================

ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_video_conferences_cohort ON video_conferences(cohort_id) WHERE cohort_id IS NOT NULL;

-- ============================================================================
-- D) COHORT CONTENT OVERRIDES — per-cohort lesson availability
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cohort_content_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  cohort_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_content_overrides_tenant ON cohort_content_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cohort_content_overrides_cohort ON cohort_content_overrides(cohort_id);

-- ============================================================================
-- E) COHORT FACILITATORS — assign instructors/TAs per cohort
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cohort_facilitators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  cohort_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'facilitator' CHECK (role IN ('lead', 'facilitator', 'ta')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_facilitators_tenant ON cohort_facilitators(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cohort_facilitators_cohort ON cohort_facilitators(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_facilitators_user ON cohort_facilitators(user_id);

-- ============================================================================
-- F) COHORT ANALYTICS — cached per-cohort summary
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cohort_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  cohort_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  total_enrolled INTEGER DEFAULT 0,
  active_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  dropped_count INTEGER DEFAULT 0,
  avg_progress DECIMAL(5,2) DEFAULT 0,
  avg_grade DECIMAL(5,2),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_analytics_tenant ON cohort_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cohort_analytics_cohort ON cohort_analytics(cohort_id);

-- ============================================================================
-- G) UPDATE ENROLLMENTS UNIQUE CONSTRAINT
-- ============================================================================
-- Allow same student to enroll in different cohorts of the same course.
-- Use partial unique indexes to handle the NULL class_id case (backward compat).

ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_course_id_key;

-- Students can only have one enrollment per course when not in a cohort
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_no_cohort
  ON enrollments(student_id, course_id) WHERE class_id IS NULL;

-- Students can only be in each cohort once
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_cohort
  ON enrollments(student_id, course_id, class_id) WHERE class_id IS NOT NULL;

-- ============================================================================
-- H) RLS POLICIES
-- ============================================================================

ALTER TABLE cohort_content_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_facilitators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_analytics ENABLE ROW LEVEL SECURITY;

-- cohort_content_overrides
CREATE POLICY "View cohort content overrides" ON cohort_content_overrides
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Staff manage cohort content overrides" ON cohort_content_overrides
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

-- cohort_facilitators
CREATE POLICY "View cohort facilitators" ON cohort_facilitators
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Staff manage cohort facilitators" ON cohort_facilitators
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor')
    )
  );

-- cohort_analytics
CREATE POLICY "View cohort analytics" ON cohort_analytics
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Staff manage cohort analytics" ON cohort_analytics
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor')
    )
  );

-- ============================================================================
-- I) GRANTS
-- ============================================================================

GRANT ALL ON cohort_content_overrides TO authenticated;
GRANT ALL ON cohort_content_overrides TO service_role;
GRANT ALL ON cohort_facilitators TO authenticated;
GRANT ALL ON cohort_facilitators TO service_role;
GRANT ALL ON cohort_analytics TO authenticated;
GRANT ALL ON cohort_analytics TO service_role;

-- ============================================================================
-- J) AUTO-UPDATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_cohort_content_overrides_updated_at ON cohort_content_overrides;
CREATE TRIGGER trigger_cohort_content_overrides_updated_at
  BEFORE UPDATE ON cohort_content_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_cohort_analytics_updated_at ON cohort_analytics;
CREATE TRIGGER trigger_cohort_analytics_updated_at
  BEFORE UPDATE ON cohort_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
