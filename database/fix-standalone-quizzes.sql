-- Fix Standalone Quizzes Without Course Association
-- This script helps identify and fix quizzes that aren't linked to lessons

-- 1. Show all quizzes without course_id
SELECT 'Quizzes without course_id' as status;
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.course_id IS NULL
ORDER BY q.created_at DESC;

-- 2. Show available courses for reference
SELECT 'Available Courses' as status;
SELECT id, title FROM courses ORDER BY title;

-- 3. Show available lessons for reference
SELECT 'Available Lessons' as status;
SELECT id, title, course_id FROM lessons ORDER BY title;

-- 4. Manual fix examples (uncomment and modify as needed)
-- Option A: Link quiz to a lesson
-- UPDATE quizzes 
-- SET lesson_id = 'your-lesson-id-here'
-- WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- Option B: Assign course directly to quiz
-- UPDATE quizzes 
-- SET course_id = 'your-course-id-here'
-- WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 5. After manual fixes, run this to update course_id for quizzes linked to lessons
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- 6. Show final status
SELECT 'Final Status' as status;
SELECT 
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as quizzes_with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as quizzes_without_course_id
FROM quizzes;
