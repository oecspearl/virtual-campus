-- Auto-Fix Lessons Without Course Associations
-- This script will automatically assign courses to lessons that don't have them

-- 1. Show current status
SELECT 
    'Before Fix' as status,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as lessons_with_course,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as lessons_without_course
FROM lessons;

-- 2. Show lessons that will be fixed
SELECT 
    'Lessons to be Fixed' as status,
    l.id,
    l.title,
    l.course_id,
    COUNT(q.id) as quiz_count
FROM lessons l
LEFT JOIN quizzes q ON l.id = q.lesson_id
WHERE l.course_id IS NULL
GROUP BY l.id, l.title, l.course_id
ORDER BY quiz_count DESC;

-- 3. Get the first available course
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

-- 4. Update all lessons without course_id to use the first available course
UPDATE lessons 
SET course_id = (SELECT id FROM courses ORDER BY created_at ASC LIMIT 1),
    updated_at = NOW()
WHERE course_id IS NULL;

-- 5. Show which lessons were updated
SELECT 
    'Updated Lessons' as status,
    l.id,
    l.title,
    l.course_id,
    c.title as course_title,
    COUNT(q.id) as quiz_count
FROM lessons l
JOIN courses c ON l.course_id = c.id
LEFT JOIN quizzes q ON l.id = q.lesson_id
WHERE l.updated_at >= NOW() - INTERVAL '1 minute'
GROUP BY l.id, l.title, l.course_id, c.title
ORDER BY l.updated_at DESC;

-- 6. Update quiz_attempts to have the correct course_id
UPDATE quiz_attempts 
SET course_id = l.course_id
FROM lessons l
JOIN quizzes q ON l.id = q.lesson_id
WHERE quiz_attempts.quiz_id = q.id
AND quiz_attempts.course_id IS NULL
AND l.course_id IS NOT NULL;

-- 7. Show quiz attempts that were updated
SELECT 
    'Updated Quiz Attempts' as status,
    COUNT(*) as attempts_updated
FROM quiz_attempts qa
WHERE qa.updated_at >= NOW() - INTERVAL '1 minute';

-- 8. Final verification
SELECT 
    'After Fix' as status,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as lessons_with_course,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as lessons_without_course
FROM lessons;

-- 9. Verify all quizzes now have course associations
SELECT 
    'Quiz Course Associations' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN q.course_id IS NOT NULL THEN 1 END) as quizzes_with_direct_course,
    COUNT(CASE WHEN l.course_id IS NOT NULL THEN 1 END) as quizzes_with_lesson_course,
    COUNT(CASE WHEN q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL) THEN 1 END) as quizzes_without_course
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id;

-- 10. Show any remaining issues
SELECT 
    'Remaining Issues' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE (q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL))
ORDER BY q.created_at DESC;
