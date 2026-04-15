-- ============================================================================
-- Part 15: Course Formats & Sections
-- ============================================================================
-- Adds course_format to courses and a course_sections table for grouping
-- lessons into topics, weeks, or other organizational structures.
-- ============================================================================

-- ============================================================================
-- ADD course_format AND start_date TO COURSES
-- ============================================================================

ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_format VARCHAR NOT NULL DEFAULT 'lessons'
  CHECK (course_format IN ('lessons', 'topics', 'weekly', 'grid'));

-- start_date is used by the weekly format to auto-generate week labels
ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_date DATE;

-- ============================================================================
-- COURSE SECTIONS — group lessons under topics or weeks
-- ============================================================================

CREATE TABLE public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  start_date DATE,         -- used by weekly format
  end_date DATE,           -- used by weekly format
  collapsed BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_sections_tenant ON course_sections(tenant_id);
CREATE INDEX idx_course_sections_course ON course_sections(course_id);
CREATE INDEX idx_course_sections_order ON course_sections(course_id, "order");

-- Add section_id to lessons so they can be grouped
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view published sections for courses they can see
CREATE POLICY "Anyone can view course sections" ON course_sections
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

-- Staff can manage sections
CREATE POLICY "Staff manage course sections" ON course_sections
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_course_sections_updated_at ON course_sections;
CREATE TRIGGER trigger_course_sections_updated_at
  BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
