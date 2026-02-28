-- Fix enrollment schema to support course enrollments
-- Add course_id column to enrollments table
ALTER TABLE enrollments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Update the unique constraint to allow both class and course enrollments
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_class_id_student_id_key;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_class_student_unique UNIQUE(class_id, student_id);
ALTER TABLE enrollments ADD CONSTRAINT enrollments_course_student_unique UNIQUE(course_id, student_id);

-- Add check constraint to ensure either class_id or course_id is provided
ALTER TABLE enrollments ADD CONSTRAINT enrollments_class_or_course_check 
CHECK (
  (class_id IS NOT NULL AND course_id IS NULL) OR 
  (class_id IS NULL AND course_id IS NOT NULL)
);

-- Update existing enrollments to use course_id instead of class_id if needed
-- (This assumes existing enrollments are actually course enrollments)
-- UPDATE enrollments SET course_id = class_id WHERE class_id IS NOT NULL;
-- UPDATE enrollments SET class_id = NULL WHERE course_id IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
