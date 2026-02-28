-- Fix Lessons Without Course Associations
-- This script will identify and fix lessons that don't have course_id, which prevents their quizzes from working

-- 1. Find lessons without course associations
SELECT 
    'Lessons Without Course Association' as status,
    l.id,
    l.title,
    l.course_id,
    COUNT(q.id) as quiz_count
FROM lessons l
LEFT JOIN quizzes q ON l.id = q.lesson_id
WHERE l.course_id IS NULL
GROUP BY l.id, l.title, l.course_id
ORDER BY quiz_count DESC;

-- 2. Show quizzes affected by lessons without courses
SELECT 
    'Quizzes Affected by Lessons Without Courses' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
JOIN lessons l ON q.lesson_id = l.id
WHERE l.course_id IS NULL
ORDER BY q.created_at DESC;

-- 3. Show available courses for assignment
SELECT 
    'Available Courses' as status,
    c.id,
    c.title,
    COUNT(l.id) as existing_lessons
FROM courses c
LEFT JOIN lessons l ON c.id = l.course_id
GROUP BY c.id, c.title
ORDER BY c.title;

-- 4. Show quiz attempts that are failing due to lessons without courses
SELECT 
    'Failed Quiz Attempts Due to Missing Course' as status,
    qa.id as attempt_id,
    qa.quiz_id,
    q.title as quiz_title,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    qa.student_id,
    qa.status,
    qa.created_at as attempt_created
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
JOIN lessons l ON q.lesson_id = l.id
WHERE l.course_id IS NULL
ORDER BY qa.created_at DESC;

-- 5. Manual fix options (uncomment and modify as needed):
-- Option A: Assign a specific course to a lesson
-- UPDATE lessons 
-- SET course_id = 'your-course-id-here'
-- WHERE id = 'lesson-id-here';

-- Option B: Assign all lessons without courses to the first available course
-- UPDATE lessons 
-- SET course_id = (SELECT id FROM courses ORDER BY created_at ASC LIMIT 1)
-- WHERE course_id IS NULL;

-- Option C: Assign lessons to courses based on some criteria (e.g., by title pattern)
-- UPDATE lessons 
-- SET course_id = 'course-id-here'
-- WHERE title ILIKE '%pattern%' AND course_id IS NULL;

-- 6. After fixing lessons, update any quiz_attempts that might have NULL course_id
UPDATE quiz_attempts 
SET course_id = l.course_id
FROM lessons l
JOIN quizzes q ON l.id = q.lesson_id
WHERE quiz_attempts.quiz_id = q.id
AND quiz_attempts.course_id IS NULL
AND l.course_id IS NOT NULL;

-- 7. Final verification
SELECT 
    'Final Verification' as status,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as lessons_with_course,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as lessons_without_course
FROM lessons;

-- 8. Show remaining issues
SELECT 
    'Remaining Issues' as status,
    l.id,
    l.title,
    l.course_id,
    COUNT(q.id) as quiz_count
FROM lessons l
LEFT JOIN quizzes q ON l.id = q.lesson_id
WHERE l.course_id IS NULL
GROUP BY l.id, l.title, l.course_id
ORDER BY quiz_count DESC;
