-- Fix Quiz Course Linking for Gradebook Integration
-- This script ensures quizzes are properly linked to courses for gradebook functionality

-- 1. Add course_id column to quizzes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quizzes' AND column_name = 'course_id') THEN
        ALTER TABLE quizzes ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Update existing quizzes to have course_id based on their lesson's course_id
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- 3. For quizzes without lessons, we need to handle them manually
-- This will set course_id to NULL for standalone quizzes (they won't appear in gradebook)
-- You can manually update these if needed:
-- UPDATE quizzes SET course_id = 'your-course-id' WHERE course_id IS NULL AND lesson_id IS NULL;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);

-- 5. Add course_id column to quiz_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'course_id') THEN
        ALTER TABLE quiz_attempts ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Update quiz_attempts to have course_id based on their quiz's course_id
UPDATE quiz_attempts 
SET course_id = quizzes.course_id
FROM quizzes 
WHERE quiz_attempts.quiz_id = quizzes.id 
AND quiz_attempts.course_id IS NULL;

-- 7. Create index for quiz_attempts course_id
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_id ON quiz_attempts(course_id);

-- 8. Verify the results
SELECT 
    'Quizzes with course_id' as status,
    COUNT(*) as count
FROM quizzes 
WHERE course_id IS NOT NULL

UNION ALL

SELECT 
    'Quizzes without course_id' as status,
    COUNT(*) as count
FROM quizzes 
WHERE course_id IS NULL

UNION ALL

SELECT 
    'Quiz attempts with course_id' as status,
    COUNT(*) as count
FROM quiz_attempts 
WHERE course_id IS NOT NULL

UNION ALL

SELECT 
    'Quiz attempts without course_id' as status,
    COUNT(*) as count
FROM quiz_attempts 
WHERE course_id IS NULL;
