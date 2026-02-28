-- Test Without RLS
-- This script will temporarily disable RLS to test if that's the issue

-- 1. Check current RLS status
SELECT 
    'Current RLS Status' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'course_grade_items';

-- 2. Temporarily disable RLS for testing
ALTER TABLE course_grade_items DISABLE ROW LEVEL SECURITY;

-- 3. Test query without RLS
SELECT 
    'Test Without RLS' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN course_id = '79acf81c-be24-4de2-a392-04cba13998d6' THEN 1 END) as items_for_course
FROM course_grade_items;

-- 4. Show items for the specific course
SELECT 
    'Course Items Without RLS' as status,
    id,
    title,
    type,
    course_id,
    is_active
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
ORDER BY created_at;

-- 5. Re-enable RLS
ALTER TABLE course_grade_items ENABLE ROW LEVEL SECURITY;

-- 6. Verify RLS is re-enabled
SELECT 
    'RLS Re-enabled' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'course_grade_items';
