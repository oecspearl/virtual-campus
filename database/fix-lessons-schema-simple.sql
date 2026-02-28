-- Simple migration to add course_id to lessons table
-- This handles existing constraints properly

-- Step 1: Add course_id column to lessons table (if it doesn't exist)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Step 2: Make subject_id nullable since lessons can exist directly under courses
ALTER TABLE lessons ALTER COLUMN subject_id DROP NOT NULL;

-- Step 3: Drop existing constraint if it exists and add new one
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_lesson_parent') THEN
        ALTER TABLE lessons DROP CONSTRAINT check_lesson_parent;
    END IF;
    
    -- Add the new constraint
    ALTER TABLE lessons ADD CONSTRAINT check_lesson_parent 
    CHECK (
      (course_id IS NOT NULL) OR (subject_id IS NOT NULL)
    );
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
END $$;

-- Step 4: Create index for better performance when querying lessons by course
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- Step 5: Update existing lessons to have course_id based on their subject's course
UPDATE lessons 
SET course_id = subjects.course_id 
FROM subjects 
WHERE lessons.subject_id = subjects.id 
AND lessons.course_id IS NULL;

-- Step 6: Add comments explaining the new structure
COMMENT ON COLUMN lessons.course_id IS 'Direct reference to course - lessons can exist directly under courses or under subjects';
COMMENT ON COLUMN lessons.subject_id IS 'Reference to subject - nullable, lessons can exist directly under courses';


























