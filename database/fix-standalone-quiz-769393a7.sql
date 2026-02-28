-- Fix Standalone Quiz 769393a7-0fbb-4aa6-89b9-6aec33391ccd
-- This script will fix the specific quiz that's causing the 400 error

-- 1. Check if the quiz exists and its current status
SELECT 
    'Quiz Status Check' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 2. If the quiz doesn't exist, we need to check what's happening
-- Let's see all quizzes with similar names
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

-- 3. Check if there are any quiz attempts for this quiz
SELECT 
    'Quiz Attempts' as status,
    qa.id as attempt_id,
    qa.quiz_id,
    qa.student_id,
    qa.course_id,
    qa.status,
    qa.score,
    qa.submitted_at
FROM quiz_attempts qa
WHERE qa.quiz_id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 4. If the quiz exists but has no course_id, we need to fix it
-- First, let's see what courses are available
SELECT 
    'Available Courses' as status,
    c.id,
    c.title
FROM courses c
ORDER BY c.title;

-- 5. If the quiz exists but has no lesson_id, we need to either:
--    a) Link it to a lesson, or
--    b) Give it a direct course_id
-- Let's see what lessons are available
SELECT 
    'Available Lessons' as status,
    l.id,
    l.title,
    l.course_id,
    c.title as course_title
FROM lessons l
JOIN courses c ON l.course_id = c.id
ORDER BY c.title, l.title;

-- 6. Manual fix options (uncomment and modify as needed):
-- Option A: Link quiz to a lesson
-- UPDATE quizzes 
-- SET lesson_id = 'your-lesson-id-here'
-- WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- Option B: Give quiz a direct course_id
-- UPDATE quizzes 
-- SET course_id = 'your-course-id-here'
-- WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 7. After fixing, verify the quiz can be found
SELECT 
    'After Fix Verification' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    CASE 
        WHEN q.course_id IS NOT NULL THEN 'Has course_id'
        WHEN l.course_id IS NOT NULL THEN 'Has course_id via lesson'
        ELSE 'No course_id'
    END as course_status
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';
