-- Debug Quiz 317c486e-3ece-42fe-a8ff-c9f539b1a683
-- This quiz is failing with 400 Bad Request when creating attempts

-- 1. Check if quiz exists
SELECT 
    'Quiz Exists' as check_type,
    id,
    title,
    lesson_id,
    course_id,
    points,
    time_limit,
    created_at
FROM quizzes 
WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683';

-- 2. Check lesson association
SELECT 
    'Lesson Association' as check_type,
    l.id as lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    l.subject_id as lesson_subject_id
FROM lessons l
WHERE l.id = (
    SELECT lesson_id 
    FROM quizzes 
    WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683'
);

-- 3. Check course association
SELECT 
    'Course Association' as check_type,
    c.id as course_id,
    c.title as course_title,
    c.code as course_code
FROM courses c
WHERE c.id = (
    SELECT l.course_id 
    FROM lessons l
    WHERE l.id = (
        SELECT lesson_id 
        FROM quizzes 
        WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683'
    )
);

-- 4. Check if quiz has questions
SELECT 
    'Quiz Questions' as check_type,
    COUNT(*) as question_count
FROM questions 
WHERE quiz_id = '317c486e-3ece-42fe-a8ff-c9f539b1a683';

-- 5. Check existing attempts
SELECT 
    'Existing Attempts' as check_type,
    COUNT(*) as attempt_count,
    MAX(created_at) as last_attempt
FROM quiz_attempts 
WHERE quiz_id = '317c486e-3ece-42fe-a8ff-c9f539b1a683';

-- 6. Check if quiz is active
SELECT 
    'Quiz Status' as check_type,
    id,
    title,
    is_active,
    created_at,
    updated_at
FROM quizzes 
WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683';

-- 7. Check for any RLS issues
SELECT 
    'RLS Check' as check_type,
    'quizzes' as table_name,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN id = '317c486e-3ece-42fe-a8ff-c9f539b1a683' THEN 1 END) as target_quiz_found
FROM quizzes;

-- 8. Check lesson RLS
SELECT 
    'Lesson RLS Check' as check_type,
    'lessons' as table_name,
    COUNT(*) as total_lessons,
    COUNT(CASE WHEN id = (
        SELECT lesson_id 
        FROM quizzes 
        WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683'
    ) THEN 1 END) as target_lesson_found
FROM lessons;

-- 9. Check course RLS
SELECT 
    'Course RLS Check' as check_type,
    'courses' as table_name,
    COUNT(*) as total_courses,
    COUNT(CASE WHEN id = (
        SELECT l.course_id 
        FROM lessons l
        WHERE l.id = (
            SELECT lesson_id 
            FROM quizzes 
            WHERE id = '317c486e-3ece-42fe-a8ff-c9f539b1a683'
        )
    ) THEN 1 END) as target_course_found
FROM courses;
