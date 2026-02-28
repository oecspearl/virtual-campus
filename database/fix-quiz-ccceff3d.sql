-- Fix Quiz ccceff3d-0806-418c-bcc4-9aa6817097d6 and similar issues
-- This script ensures quizzes have proper course associations

-- 1. First, let's see what we're working with
SELECT 
    'Before Fix' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 2. Update the specific quiz to have course_id from its lesson
UPDATE quizzes 
SET course_id = l.course_id,
    updated_at = NOW()
FROM lessons l
WHERE quizzes.lesson_id = l.id 
  AND quizzes.id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6'
  AND quizzes.course_id IS NULL;

-- 3. Update all quizzes that don't have course_id but have lesson_id
UPDATE quizzes 
SET course_id = l.course_id,
    updated_at = NOW()
FROM lessons l
WHERE quizzes.lesson_id = l.id 
  AND quizzes.course_id IS NULL
  AND l.course_id IS NOT NULL;

-- 4. Show the results
SELECT 
    'After Fix' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 5. Show count of quizzes that still need fixing
SELECT 
    'Remaining Issues' as status,
    COUNT(*) as quizzes_without_course_id
FROM quizzes 
WHERE course_id IS NULL 
  AND lesson_id IS NOT NULL;

-- 6. Show quizzes that still need manual fixing (lesson has no course)
SELECT 
    'Quizzes with Orphaned Lessons' as status,
    q.id,
    q.title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.course_id IS NULL 
  AND q.lesson_id IS NOT NULL
  AND (l.course_id IS NULL OR l.id IS NULL)
LIMIT 10;
