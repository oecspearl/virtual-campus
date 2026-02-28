-- Debug Quiz 769393a7-0fbb-4aa6-89b9-6aec33391ccd
-- Detailed investigation of why this quiz is failing

-- 1. Check if the quiz exists
SELECT 
    'Quiz Exists Check' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM quizzes WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as quiz_exists;

-- 2. Get quiz details
SELECT 
    'Quiz Details' as status,
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    q.published,
    q.created_at
FROM quizzes q
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 3. Check the lesson associated with this quiz
SELECT 
    'Lesson Details' as status,
    l.id,
    l.title,
    l.course_id,
    l.published,
    l.created_at
FROM lessons l
WHERE l.id = (SELECT lesson_id FROM quizzes WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd');

-- 4. Check the course associated with the lesson
SELECT 
    'Course Details' as status,
    c.id,
    c.title,
    c.published,
    c.created_at
FROM courses c
WHERE c.id = (
    SELECT l.course_id 
    FROM lessons l 
    WHERE l.id = (SELECT lesson_id FROM quizzes WHERE id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd')
);

-- 5. Check if there are any quiz attempts for this quiz
SELECT 
    'Quiz Attempts' as status,
    COUNT(*) as attempt_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
    COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded
FROM quiz_attempts
WHERE quiz_id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 6. Check the exact query that the API would run
SELECT 
    'API Query Simulation' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.lesson_id,
    q.course_id as quiz_course_id,
    l.id as lesson_id,
    l.title as lesson_title,
    l.course_id as lesson_course_id,
    CASE 
        WHEN q.course_id IS NOT NULL THEN q.course_id
        WHEN l.course_id IS NOT NULL THEN l.course_id
        ELSE NULL
    END as resolved_course_id
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 7. Check if there are any RLS policies blocking access
SELECT 
    'RLS Policies Check' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('quizzes', 'lessons', 'courses')
ORDER BY tablename, policyname;

-- 8. Check if the quiz is published
SELECT 
    'Quiz Publication Status' as status,
    q.id,
    q.title,
    q.published,
    l.published as lesson_published,
    c.published as course_published
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE q.id = '769393a7-0fbb-4aa6-89b9-6aec33391ccd';

-- 9. Check for any foreign key constraints
SELECT 
    'Foreign Key Constraints' as status,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('quizzes', 'lessons')
ORDER BY tc.table_name, kcu.column_name;
