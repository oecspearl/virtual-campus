-- Add course_id column to lessons table - NO SUBJECTS NEEDED
-- This allows lessons to exist directly under courses

-- Step 1: Add course_id column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Step 2: Make subject_id nullable (optional)
ALTER TABLE lessons ALTER COLUMN subject_id DROP NOT NULL;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- Step 4: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('course_id', 'subject_id');


























