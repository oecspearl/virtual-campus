-- Fix All Standalone Quizzes
-- This script will identify and fix all quizzes that can't be started due to missing course associations

-- 1. Find all quizzes without course associations
SELECT 
    'Quizzes Without Course Association' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    CASE 
        WHEN q.course_id IS NOT NULL THEN 'Has direct course_id'
        WHEN l.course_id IS NOT NULL THEN 'Has course_id via lesson'
        ELSE 'NO COURSE ASSOCIATION'
    END as course_status
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE (q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL))
ORDER BY q.created_at DESC;

-- 2. Find quizzes that have lesson_id but lesson has no course_id
SELECT 
    'Quizzes with Lesson but No Course' as status,
    q.id,
    q.title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
JOIN lessons l ON q.lesson_id = l.id
WHERE l.course_id IS NULL
ORDER BY q.created_at DESC;

-- 3. Get available courses for manual assignment
SELECT 
    'Available Courses for Assignment' as status,
    c.id,
    c.title,
    COUNT(l.id) as lesson_count
FROM courses c
LEFT JOIN lessons l ON c.id = l.course_id
GROUP BY c.id, c.title
ORDER BY c.title;

-- 4. Get available lessons for linking
SELECT 
    'Available Lessons for Linking' as status,
    l.id,
    l.title,
    c.title as course_title,
    c.id as course_id
FROM lessons l
JOIN courses c ON l.course_id = c.id
ORDER BY c.title, l.title;

-- 5. Show quiz attempts that are failing due to missing course associations
SELECT 
    'Failed Quiz Attempts' as status,
    qa.id as attempt_id,
    qa.quiz_id,
    q.title as quiz_title,
    qa.student_id,
    qa.status,
    qa.created_at as attempt_created
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
WHERE qa.status = 'in_progress'
AND (q.course_id IS NULL AND (q.lesson_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.id = q.lesson_id AND l.course_id IS NOT NULL
)))
ORDER BY qa.created_at DESC;

-- 6. Manual fix template - uncomment and modify as needed
-- For each quiz that needs fixing, choose one of these options:

-- Option A: Link quiz to an existing lesson
-- UPDATE quizzes 
-- SET lesson_id = 'lesson-id-here'
-- WHERE id = 'quiz-id-here';

-- Option B: Give quiz a direct course_id
-- UPDATE quizzes 
-- SET course_id = 'course-id-here'
-- WHERE id = 'quiz-id-here';

-- Option C: Create a new lesson for the quiz
-- INSERT INTO lessons (id, course_id, title, description, "order", published, created_at, updated_at)
-- VALUES (gen_random_uuid(), 'course-id-here', 'Quiz Lesson', 'Lesson for standalone quiz', 999, true, NOW(), NOW());
-- 
-- UPDATE quizzes 
-- SET lesson_id = (SELECT id FROM lessons WHERE course_id = 'course-id-here' AND title = 'Quiz Lesson' ORDER BY created_at DESC LIMIT 1)
-- WHERE id = 'quiz-id-here';

-- 7. After manual fixes, run this to verify all quizzes have course associations
SELECT 
    'Final Verification' as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN q.course_id IS NOT NULL THEN 1 END) as quizzes_with_direct_course,
    COUNT(CASE WHEN l.course_id IS NOT NULL THEN 1 END) as quizzes_with_lesson_course,
    COUNT(CASE WHEN q.course_id IS NULL AND (l.course_id IS NULL OR l.id IS NULL) THEN 1 END) as quizzes_without_course
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id;
