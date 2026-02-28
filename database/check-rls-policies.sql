-- ==============================================
-- CHECK RLS POLICIES ON GRADEBOOK TABLES
-- Run this to see what policies exist and might be blocking access
-- ==============================================

-- 1. Check if RLS is enabled on gradebook tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('course_grades', 'course_grade_items', 'quizzes', 'quiz_attempts')
AND schemaname = 'public';

-- 2. List all RLS policies on course_grades
SELECT
    policyname,
    tablename,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'course_grades';

-- 3. List all RLS policies on course_grade_items
SELECT
    policyname,
    tablename,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'course_grade_items';

-- 4. List all RLS policies on quizzes
SELECT
    policyname,
    tablename,
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'quizzes';

-- 5. Check if there are any errors in the last few minutes (if you have logging enabled)
-- This might not work depending on your Supabase setup
SELECT COUNT(*) as recent_errors FROM pg_stat_statements WHERE query LIKE '%course_grades%' LIMIT 1;
