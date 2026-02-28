-- Auto-Fix Standalone Quizzes
-- This script will automatically assign courses to standalone quizzes

-- 1. First, let's see what we're working with
SELECT 
    'Before Fix' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN q.course_id IS NOT NULL THEN 1 END) as quizzes_with_direct_course,
    COUNT(CASE WHEN l.course_id IS NOT NULL THEN 1 END) as quizzes_with_lesson_course,
    COUNT(CASE WHEN q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL) THEN 1 END) as standalone_quizzes
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id;

-- 2. Get the first available course to use as default
-- (You can modify this to use a specific course)
WITH default_course AS (
    SELECT id, title 
    FROM courses 
    ORDER BY created_at ASC 
    LIMIT 1
)
SELECT 
    'Default Course Selected' as status,
    id as course_id,
    title as course_title
FROM default_course;

-- 3. Update standalone quizzes to have a course_id
-- This assigns them to the first available course
WITH default_course AS (
    SELECT id 
    FROM courses 
    ORDER BY created_at ASC 
    LIMIT 1
)
UPDATE quizzes 
SET course_id = (SELECT id FROM default_course)
WHERE course_id IS NULL 
AND (lesson_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM lessons l 
    WHERE l.id = quizzes.lesson_id 
    AND l.course_id IS NOT NULL
));

-- 4. Show which quizzes were updated
SELECT 
    'Updated Quizzes' as status,
    q.id,
    q.title,
    q.course_id,
    c.title as course_title
FROM quizzes q
JOIN courses c ON q.course_id = c.id
WHERE q.updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY q.updated_at DESC;

-- 5. Update quiz_attempts to have the same course_id
UPDATE quiz_attempts 
SET course_id = q.course_id
FROM quizzes q
WHERE quiz_attempts.quiz_id = q.id
AND quiz_attempts.course_id IS NULL
AND q.course_id IS NOT NULL;

-- 6. Final verification
SELECT 
    'After Fix' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN q.course_id IS NOT NULL THEN 1 END) as quizzes_with_direct_course,
    COUNT(CASE WHEN l.course_id IS NOT NULL THEN 1 END) as quizzes_with_lesson_course,
    COUNT(CASE WHEN q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL) THEN 1 END) as standalone_quizzes
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id;

-- 7. Show any remaining issues
SELECT 
    'Remaining Issues' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.course_id IS NULL 
AND (l.course_id IS NULL OR l.id IS NULL);
