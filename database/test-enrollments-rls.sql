-- Test RLS Policies for Enrollments Table
-- Run this in your Supabase SQL editor to test the participant loading

-- 1. Check if RLS is enabled on enrollments table
SELECT 
    'RLS Status Check' as info,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'enrollments';

-- 2. Check if enrollments table has the required columns
SELECT 
    'Enrollments Table Structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;

-- 3. Check existing RLS policies
SELECT 
    'Existing RLS Policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- 4. Test if we can query enrollments (this should work for admins)
SELECT 
    'Test Query' as info,
    COUNT(*) as total_enrollments
FROM enrollments;

-- 5. Check if there are any enrollments with course_id
SELECT 
    'Course-based Enrollments' as info,
    COUNT(*) as enrollments_with_course_id,
    COUNT(CASE WHEN course_id IS NOT NULL THEN 1 END) as with_course_id,
    COUNT(CASE WHEN course_id IS NULL THEN 1 END) as without_course_id
FROM enrollments;

-- 6. Sample enrollments data
SELECT 
    'Sample Data' as info,
    id,
    course_id,
    student_id,
    status,
    enrolled_at,
    student_name,
    student_email
FROM enrollments
LIMIT 5;
