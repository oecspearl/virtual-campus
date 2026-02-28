-- Debug Enrollments Table Structure and Data
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if enrollments table exists
SELECT 
    'Table Exists Check' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'enrollments' 
AND table_schema = 'public';

-- 2. Check RLS status
SELECT 
    'RLS Status' as info,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'enrollments';

-- 3. Check table structure
SELECT 
    'Table Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check existing RLS policies
SELECT 
    'RLS Policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- 5. Check if there's any data
SELECT 
    'Data Count' as info,
    COUNT(*) as total_rows
FROM enrollments;

-- 6. Check for course_id column specifically
SELECT 
    'Course ID Column Check' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND column_name = 'course_id'
AND table_schema = 'public';

-- 7. Sample data (if any exists)
SELECT 
    'Sample Data' as info,
    id,
    course_id,
    student_id,
    status,
    enrolled_at
FROM enrollments
LIMIT 3;

-- 8. Check if the specific course exists
SELECT 
    'Course Check' as info,
    id,
    title,
    published
FROM courses
WHERE id = 'b18abae6-6489-43ff-896b-ed3af74101b1';

-- 9. Test a simple query (this might fail due to RLS)
SELECT 
    'Test Query' as info,
    COUNT(*) as enrollments_for_course
FROM enrollments
WHERE course_id = 'b18abae6-6489-43ff-896b-ed3af74101b1';
