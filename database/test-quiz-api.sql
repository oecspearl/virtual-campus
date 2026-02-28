-- Test Quiz API Endpoint
-- This script tests the exact query that the quiz attempt API would run

-- 1. Test the exact query from the API
SELECT 
    'API Query Test' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.id as lesson_id_from_join,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    CASE 
        WHEN q.course_id IS NOT NULL THEN q.course_id
        WHEN l.course_id IS NOT NULL THEN l.course_id
        ELSE NULL
    END as resolved_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 2. Test with a different quiz to see if the pattern works
SELECT 
    'Other Quiz Test' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.id as lesson_id_from_join,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    CASE 
        WHEN q.course_id IS NOT NULL THEN q.course_id
        WHEN l.course_id IS NOT NULL THEN l.course_id
        ELSE NULL
    END as resolved_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id != '769393a7-0fbb-4aa6-89b9-6aec33391ccd'
ORDER BY q.created_at DESC
LIMIT 5;

-- 3. Check if there are any quizzes with the same title pattern
SELECT 
    'Similar Quizzes' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.title ILIKE '%Digital Literacy%' 
   OR q.title ILIKE '%Source Evaluation%'
ORDER BY q.created_at DESC;

-- 4. Check if the quiz ID format is correct
SELECT 
    'Quiz ID Format Check' as status,
    CASE 
        WHEN '769393a7-0fbb-4aa6-89b9-6aec33391ccd' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'VALID UUID FORMAT'
        ELSE 'INVALID UUID FORMAT'
    END as uuid_format_check;

-- 5. Check if there are any quizzes with similar IDs
SELECT 
    'Similar Quiz IDs' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id
FROM quizzes q
WHERE q.id::text LIKE '769393a7%'
   OR q.id::text LIKE '%6aec33391ccd'
ORDER BY q.created_at DESC;
