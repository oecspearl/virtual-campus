-- Add course_id column to quizzes table for direct course association
-- This will help with gradebook integration and quiz attempts

-- Add course_id column to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);

-- Update existing quizzes to set course_id from their lesson
UPDATE quizzes 
SET course_id = l.course_id
FROM lessons l
WHERE quizzes.lesson_id = l.id 
  AND quizzes.course_id IS NULL
  AND l.course_id IS NOT NULL;

-- Show results
SELECT 
    'Migration Results' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as quizzes_with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as quizzes_without_course_id
FROM quizzes;
