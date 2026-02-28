-- Add course_id column to lessons table to allow direct course-lesson relationship
-- This removes the dependency on subjects for lessons

-- Step 1: Add course_id column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Step 2: Make subject_id nullable since lessons can exist directly under courses
ALTER TABLE lessons ALTER COLUMN subject_id DROP NOT NULL;

-- Step 3: Create index for better performance when querying lessons by course
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- Step 4: Update existing lessons to have course_id based on their subject's course (if any)
UPDATE lessons 
SET course_id = subjects.course_id 
FROM subjects 
WHERE lessons.subject_id = subjects.id 
AND lessons.course_id IS NULL;

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('course_id', 'subject_id');

-- Step 6: Test that we can query lessons by course
SELECT COUNT(*) as total_lessons FROM lessons;
SELECT COUNT(*) as lessons_with_course_id FROM lessons WHERE course_id IS NOT NULL;