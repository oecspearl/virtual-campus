-- ============================================================================
-- Part 22: Section-Specific Content & Content Locking
-- ============================================================================
-- Enables lecturers to add content scoped to their section (class) without
-- affecting other sections, and allows admins to lock shared course content
-- so lecturers cannot modify it.
--
-- Terminology mapping: UI "Section" = DB "classes" table
-- ============================================================================

-- ============================================================================
-- 1. SECTION-SPECIFIC LESSONS
-- ============================================================================
-- class_id on lessons: NULL = shared course content, UUID = section-specific
-- Only students enrolled in that class/section see section-specific lessons.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(class_id);

COMMENT ON COLUMN lessons.class_id IS
  'When NULL the lesson is shared across all sections. When set, the lesson is only visible to students enrolled in this section (class).';

-- ============================================================================
-- 2. CONTENT LOCKING
-- ============================================================================
-- Admins can lock individual lessons to prevent lecturers from editing them.
-- Locked lessons can still be viewed by everyone.

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lessons_locked ON lessons(course_id) WHERE locked = true;

COMMENT ON COLUMN lessons.locked IS
  'When true, only admins/super_admins can modify this lesson. Lecturers see it as read-only.';

-- ============================================================================
-- 3. SECTION-LEVEL LOCKING (lock all lessons in a section at once)
-- ============================================================================
-- Convenience: locking a course_section locks its organizational grouping,
-- but the actual enforcement is per-lesson via the locked column.

ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- ============================================================================
-- 4. SECTION (CLASS) INSTRUCTOR ASSIGNMENT HELPER VIEW
-- ============================================================================
-- Makes it easy to check if an instructor is assigned to a specific section.
-- Uses existing class_instructors + cohort_facilitators tables.

CREATE OR REPLACE FUNCTION is_section_instructor(
  p_class_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_instructors
    WHERE class_id = p_class_id AND instructor_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM cohort_facilitators
    WHERE cohort_id = p_class_id AND user_id = p_user_id
  );
$$;
