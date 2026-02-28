-- ==============================================
-- FIX GRADEBOOK CASCADE DELETE CONSTRAINTS
-- Run this migration to add ON DELETE CASCADE to gradebook-related foreign keys
-- This ensures student grades are automatically removed when grade items are deleted
-- ==============================================

-- First, check if the constraint exists before dropping
DO $$
BEGIN
    -- Drop existing foreign key constraint on course_grades.grade_item_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'course_grades_grade_item_id_fkey'
        AND table_name = 'course_grades'
    ) THEN
        ALTER TABLE public.course_grades DROP CONSTRAINT course_grades_grade_item_id_fkey;
    END IF;
END $$;

-- Add the constraint with CASCADE
ALTER TABLE public.course_grades
ADD CONSTRAINT course_grades_grade_item_id_fkey
FOREIGN KEY (grade_item_id)
REFERENCES public.course_grade_items(id)
ON DELETE CASCADE;

-- Also handle the class-level grades table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'grades_grade_item_id_fkey'
        AND table_name = 'grades'
    ) THEN
        ALTER TABLE public.grades DROP CONSTRAINT grades_grade_item_id_fkey;
        ALTER TABLE public.grades
        ADD CONSTRAINT grades_grade_item_id_fkey
        FOREIGN KEY (grade_item_id)
        REFERENCES public.grade_items(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraints were created correctly
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'course_grades' OR tc.table_name = 'grades')
ORDER BY tc.table_name;
