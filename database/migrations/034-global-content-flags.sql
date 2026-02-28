-- ============================================================================
-- Migration 034: Global Content Flags for Cross-Tenant Sharing
-- ============================================================================
-- Adds `is_global` flag to tables that can have content shared across tenants.
-- When is_global = true, the row is visible to ALL tenants regardless of tenant_id.
-- Only super_admin can set is_global = true.

-- 1. Competencies — shared competency frameworks
ALTER TABLE competencies ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 2. Learning paths — shared learning paths
ALTER TABLE learning_paths ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 3. Course categories — shared category taxonomy
ALTER TABLE course_categories ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 4. Global discussion categories — shared discussion categories
ALTER TABLE global_discussion_categories ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 5. Subjects — shared subject definitions
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 6. Programmes — shared programme definitions
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Create indexes for efficient global content queries
CREATE INDEX IF NOT EXISTS idx_competencies_global ON competencies(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_learning_paths_global ON learning_paths(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_course_categories_global ON course_categories(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_global ON global_discussion_categories(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_subjects_global ON subjects(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_programmes_global ON programmes(is_global) WHERE is_global = true;
