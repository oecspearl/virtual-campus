-- Fix Specific Quiz Course ID
-- This script will fix the quiz that's missing course_id

-- 1. Show current state
SELECT 'Current State' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.course_id IS NULL;

-- 2. Fix the quiz by setting course_id from its lesson
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- 3. Verify the fix worked
SELECT 'After Fix' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
ORDER BY q.created_at DESC;

-- 4. Final verification
SELECT 
    'Verification' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as quizzes_with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as quizzes_without_course_id
FROM quizzes;
