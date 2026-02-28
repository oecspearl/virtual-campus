-- Debug Quiz Linking for Gradebook Integration
-- This script will help identify why quizzes aren't appearing in the gradebook

-- 1. Check if course_id column exists in quizzes table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND column_name = 'course_id';

-- 2. Check all quizzes and their course relationships
SELECT 
    q.id as quiz_id,
    q.title as quiz_title,
    q.lesson_id,
    q.course_id as quiz_course_id,
    l.id as lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    c.id as course_id,
    c.title as course_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON COALESCE(q.course_id, l.course_id) = c.id
ORDER BY q.created_at DESC;

-- 3. Check specific course quizzes (replace 'YOUR_COURSE_ID' with actual course ID)
-- First, let's see what courses exist
SELECT id, title, created_at FROM courses ORDER BY created_at DESC LIMIT 10;

-- 4. Check if there are any quizzes at all
SELECT COUNT(*) as total_quizzes FROM quizzes;

-- 5. Check quiz attempts to see if students have taken the quiz
SELECT 
    qa.id as attempt_id,
    qa.quiz_id,
    qa.student_id,
    qa.score,
    qa.status,
    q.title as quiz_title,
    u.name as student_name
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
JOIN users u ON qa.student_id = u.id
ORDER BY qa.created_at DESC;

-- 6. Check grade items for the course (replace with actual course ID)
-- SELECT * FROM course_grade_items WHERE course_id = 'YOUR_COURSE_ID';

-- 7. Check if the quiz is linked to any lesson in the course
-- This will help identify the relationship
SELECT 
    q.id as quiz_id,
    q.title as quiz_title,
    q.lesson_id,
    l.title as lesson_title,
    l.course_id,
    c.title as course_title
FROM quizzes q
JOIN lessons l ON q.lesson_id = l.id
JOIN courses c ON l.course_id = c.id
WHERE c.id = 'YOUR_COURSE_ID'  -- Replace with actual course ID
ORDER BY q.created_at DESC;
