-- Comprehensive Gradebook Cleanup Script
-- This script addresses deleted quizzes, duplicate grade items, and streamlines the gradebook

-- 1. Add is_active column to course_grade_items if it doesn't exist
ALTER TABLE course_grade_items 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_grade_items_course_id ON course_grade_items(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_items_assessment_id ON course_grade_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_items_type ON course_grade_items(type);
CREATE INDEX IF NOT EXISTS idx_course_grade_items_is_active ON course_grade_items(is_active);

-- 3. Mark grade items as inactive for deleted quizzes
UPDATE course_grade_items 
SET is_active = false, updated_at = NOW()
WHERE type = 'quiz' 
  AND assessment_id IS NOT NULL
  AND assessment_id NOT IN (
    SELECT id FROM quizzes WHERE id IS NOT NULL
  );

-- 4. Mark grade items as inactive for deleted assignments
UPDATE course_grade_items 
SET is_active = false, updated_at = NOW()
WHERE type = 'assignment' 
  AND assessment_id IS NOT NULL
  AND assessment_id NOT IN (
    SELECT id FROM assignments WHERE id IS NOT NULL
  );

-- 5. Remove duplicate grade items (keep the most recent one)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, assessment_id, type 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM course_grade_items
  WHERE assessment_id IS NOT NULL
)
UPDATE course_grade_items 
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 6. Clean up orphaned grades (grades for inactive grade items)
UPDATE course_grades 
SET updated_at = NOW()
WHERE grade_item_id IN (
  SELECT id FROM course_grade_items WHERE is_active = false
);

-- 7. Remove duplicate grades (keep the most recent one)
WITH duplicate_grades AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, grade_item_id 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM course_grades
)
UPDATE course_grades 
SET updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicate_grades WHERE rn > 1
);

-- 8. Create a view for active grade items only
CREATE OR REPLACE VIEW active_course_grade_items AS
SELECT * FROM course_grade_items WHERE is_active = true;

-- 9. Create a view for active grades only
CREATE OR REPLACE VIEW active_course_grades AS
SELECT cg.* FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.is_active = true;

-- 10. Add cleanup triggers to automatically handle future deletions
CREATE OR REPLACE FUNCTION cleanup_grade_items_on_quiz_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE course_grade_items 
  SET is_active = false, updated_at = NOW()
  WHERE type = 'quiz' AND assessment_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_grade_items_on_assignment_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE course_grade_items 
  SET is_active = false, updated_at = NOW()
  WHERE type = 'assignment' AND assessment_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_cleanup_quiz_grade_items ON quizzes;
DROP TRIGGER IF EXISTS trigger_cleanup_assignment_grade_items ON assignments;

-- Create triggers
CREATE TRIGGER trigger_cleanup_quiz_grade_items
  AFTER DELETE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_grade_items_on_quiz_delete();

CREATE TRIGGER trigger_cleanup_assignment_grade_items
  AFTER DELETE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_grade_items_on_assignment_delete();

-- 11. Show cleanup results
SELECT 
  'Cleanup Results' as status,
  (SELECT COUNT(*) FROM course_grade_items WHERE is_active = true) as active_grade_items,
  (SELECT COUNT(*) FROM course_grade_items WHERE is_active = false) as inactive_grade_items,
  (SELECT COUNT(*) FROM course_grades) as total_grades,
  (SELECT COUNT(DISTINCT course_id) FROM course_grade_items WHERE is_active = true) as courses_with_grade_items;

-- 12. Show orphaned items that were cleaned up
SELECT 
  'Orphaned Quiz Items' as item_type,
  COUNT(*) as count
FROM course_grade_items 
WHERE type = 'quiz' 
  AND is_active = false
  AND assessment_id IS NOT NULL
  AND assessment_id NOT IN (SELECT id FROM quizzes WHERE id IS NOT NULL)

UNION ALL

SELECT 
  'Orphaned Assignment Items' as item_type,
  COUNT(*) as count
FROM course_grade_items 
WHERE type = 'assignment' 
  AND is_active = false
  AND assessment_id IS NOT NULL
  AND assessment_id NOT IN (SELECT id FROM assignments WHERE id IS NOT NULL)

UNION ALL

SELECT 
  'Duplicate Items Removed' as item_type,
  COUNT(*) as count
FROM course_grade_items 
WHERE is_active = false 
  AND assessment_id IS NOT NULL
  AND id IN (
    SELECT id FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY course_id, assessment_id, type 
          ORDER BY created_at DESC, id DESC
        ) as rn
      FROM course_grade_items
      WHERE assessment_id IS NOT NULL
    ) duplicates WHERE rn > 1
  );
