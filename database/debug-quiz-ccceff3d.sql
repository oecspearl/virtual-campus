-- Debug Quiz ccceff3d-0806-418c-bcc4-9aa6817097d6
-- This quiz is failing with 400 Bad Request when creating attempts

-- 1. Check if quiz exists and its basic info
SELECT 
    'Quiz Basic Info' as check_type,
    id,
    title,
    lesson_id,
    course_id,
    points,
    time_limit,
    created_at
FROM quizzes 
WHERE id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 2. Check lesson association
SELECT 
    'Lesson Association' as check_type,
    l.id as lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id
FROM lessons l
WHERE l.id = (
    SELECT lesson_id 
    FROM quizzes 
    WHERE id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6'
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
        WHERE id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6'
    )
);

-- 4. Check if quiz has questions
SELECT 
    'Quiz Questions' as check_type,
    COUNT(*) as question_count
FROM questions 
WHERE quiz_id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 5. Check existing attempts
SELECT 
    'Existing Attempts' as check_type,
    COUNT(*) as attempt_count,
    MAX(created_at) as last_attempt
FROM quiz_attempts 
WHERE quiz_id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 6. Check if quiz is active
SELECT 
    'Quiz Status' as check_type,
    id,
    title,
    is_active,
    created_at,
    updated_at
FROM quizzes 
WHERE id = 'ccceff3d-0806-418c-bcc4-9aa6817097d6';

-- 7. Show all quizzes without course associations
SELECT 
    'Quizzes Without Course ID' as check_type,
    id,
    title,
    lesson_id,
    course_id
FROM quizzes 
WHERE course_id IS NULL 
  AND lesson_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
