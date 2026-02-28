-- Complete Fix for Quiz Course Linking
-- This script ensures quizzes are properly linked to courses for gradebook functionality
-- Note: We're using the direct relationship Quiz -> Lesson -> Course (no subjects)

-- 1. Check current state
SELECT 'Current Quiz Status' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
ORDER BY q.created_at DESC
LIMIT 10;

-- 2. Add course_id column to quizzes if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quizzes' AND column_name = 'course_id') THEN
        ALTER TABLE quizzes ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added course_id column to quizzes table';
    ELSE
        RAISE NOTICE 'course_id column already exists in quizzes table';
    END IF;
END $$;

-- 3. Update quizzes to have course_id based on their lesson's course_id
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- 4. Show the results after update
SELECT 'After Update' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
ORDER BY q.created_at DESC
LIMIT 10;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);

-- 6. Show summary
SELECT 
    'Summary' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as quizzes_with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as quizzes_without_course_id
FROM quizzes;

-- 7. Show quizzes that still need course_id (if any)
SELECT 
    'Quizzes needing course_id' as status,
    q.id,
    q.title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.course_id IS NULL
ORDER BY q.created_at DESC;
