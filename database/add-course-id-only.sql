-- Add course_id column to lessons table
-- Run this FIRST in Supabase SQL Editor

-- Check current structure of lessons table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lessons' 
ORDER BY ordinal_position;

-- Add course_id column to lessons table
ALTER TABLE lessons 
ADD COLUMN course_id UUID;

-- Add foreign key constraint
ALTER TABLE lessons 
ADD CONSTRAINT fk_lessons_course_id 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name = 'course_id';