-- Fix Missing Quiz Course ID
-- This script will identify and fix the quiz that's missing course_id

-- 1. First, let's see which quiz is missing the course_id
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    c.title as course_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE q.course_id IS NULL
ORDER BY q.created_at DESC;

-- 2. Update the quiz that's missing course_id
-- This will set the course_id based on the lesson's course_id
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- 3. Verify the fix
SELECT 'After Fix' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    c.title as course_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON q.course_id = c.id
ORDER BY q.created_at DESC;

-- 4. Show final summary
SELECT 
    'Final Summary' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as quizzes_with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as quizzes_without_course_id
FROM quizzes;
