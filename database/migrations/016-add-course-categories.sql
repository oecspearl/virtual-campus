-- Migration: 016-add-course-categories.sql
-- Description: Add course categories system for organizing courses
-- Created: 2024

-- ============================================================================
-- COURSE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'material-symbols:folder',
    color VARCHAR(20) DEFAULT '#3B82F6',
    parent_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure unique slug
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'course_categories_slug_key'
    ) THEN
        ALTER TABLE course_categories ADD CONSTRAINT course_categories_slug_key UNIQUE (slug);
    END IF;
END $$;

-- ============================================================================
-- COURSE-CATEGORY JUNCTION TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_category_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, category_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_course_categories_parent ON course_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_slug ON course_categories(slug);
CREATE INDEX IF NOT EXISTS idx_course_categories_active ON course_categories(is_active, "order");
CREATE INDEX IF NOT EXISTS idx_course_category_assignments_course ON course_category_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_category_assignments_category ON course_category_assignments(category_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_category_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_categories' AND policyname = 'Anyone can view active categories'
    ) THEN
        CREATE POLICY "Anyone can view active categories" ON course_categories
            FOR SELECT USING (is_active = true);
    END IF;
END $$;

-- Admins can manage categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_categories' AND policyname = 'Admins can manage categories'
    ) THEN
        CREATE POLICY "Admins can manage categories" ON course_categories
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- Everyone can view category assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_category_assignments' AND policyname = 'Anyone can view category assignments'
    ) THEN
        CREATE POLICY "Anyone can view category assignments" ON course_category_assignments
            FOR SELECT USING (true);
    END IF;
END $$;

-- Admins and instructors can manage category assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_category_assignments' AND policyname = 'Staff can manage category assignments'
    ) THEN
        CREATE POLICY "Staff can manage category assignments" ON course_category_assignments
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
                )
            );
    END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON course_categories TO authenticated;
GRANT SELECT ON course_category_assignments TO authenticated;
GRANT ALL ON course_categories TO service_role;
GRANT ALL ON course_category_assignments TO service_role;

-- ============================================================================
-- SEED DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO course_categories (name, slug, description, icon, color, "order") VALUES
    ('Academic', 'academic', 'Traditional academic subjects and disciplines', 'material-symbols:school', '#3B82F6', 1),
    ('Professional Development', 'professional-development', 'Career and professional skills training', 'material-symbols:work', '#8B5CF6', 2),
    ('Technology', 'technology', 'Computer science, programming, and digital skills', 'material-symbols:computer', '#10B981', 3),
    ('Leadership', 'leadership', 'Leadership and management training', 'material-symbols:groups', '#F59E0B', 4),
    ('Compliance', 'compliance', 'Regulatory and compliance training', 'material-symbols:verified', '#EF4444', 5)
ON CONFLICT (slug) DO NOTHING;

-- Add sub-categories
INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT
    'Mathematics', 'mathematics', 'Math courses and quantitative skills', 'material-symbols:calculate', '#3B82F6', id, 1
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT
    'Science', 'science', 'Natural and physical sciences', 'material-symbols:science', '#10B981', id, 2
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT
    'Language Arts', 'language-arts', 'Reading, writing, and communication', 'material-symbols:menu-book', '#8B5CF6', id, 3
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT
    'Social Studies', 'social-studies', 'History, geography, and civics', 'material-symbols:public', '#F59E0B', id, 4
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Get category path (for breadcrumbs)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_category_path(category_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    slug VARCHAR(100),
    level INTEGER
) AS $$
WITH RECURSIVE category_path AS (
    SELECT
        cc.id,
        cc.name,
        cc.slug,
        cc.parent_id,
        1 as level
    FROM course_categories cc
    WHERE cc.id = category_id

    UNION ALL

    SELECT
        cc.id,
        cc.name,
        cc.slug,
        cc.parent_id,
        cp.level + 1
    FROM course_categories cc
    INNER JOIN category_path cp ON cc.id = cp.parent_id
)
SELECT
    category_path.id,
    category_path.name,
    category_path.slug,
    category_path.level
FROM category_path
ORDER BY level DESC;
$$ LANGUAGE SQL;

-- ============================================================================
-- HELPER FUNCTION: Get all descendant categories
-- ============================================================================

CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
RETURNS TABLE (id UUID) AS $$
WITH RECURSIVE descendants AS (
    SELECT cc.id
    FROM course_categories cc
    WHERE cc.parent_id = parent_category_id

    UNION ALL

    SELECT cc.id
    FROM course_categories cc
    INNER JOIN descendants d ON cc.parent_id = d.id
)
SELECT id FROM descendants;
$$ LANGUAGE SQL;
