-- Debug RLS and Course Mismatch
-- This script will check if RLS is blocking access or if there's a course mismatch

-- 1. Check if RLS is enabled on course_grade_items table
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'course_grade_items';

-- 2. Check RLS policies on course_grade_items
SELECT 
    'RLS Policies' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'course_grade_items';

-- 3. Check if the course ID exists in courses table
SELECT 
    'Course Exists' as check_type,
    id,
    title,
    created_at
FROM courses 
WHERE id = '79acf81c-be24-4de2-a392-04cba13998d6';

-- 4. Check if there are gradebook items for ANY course
SELECT 
    'Any Grade Items' as check_type,
    COUNT(*) as total_items,
    COUNT(DISTINCT course_id) as unique_courses
FROM course_grade_items;

-- 5. Show sample gradebook items from any course
SELECT 
    'Sample Items' as check_type,
    id,
    title,
    type,
    course_id,
    is_active,
    created_at
FROM course_grade_items 
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if there are gradebook items with similar course IDs
SELECT 
    'Similar Course IDs' as check_type,
    course_id,
    COUNT(*) as item_count
FROM course_grade_items 
WHERE course_id::text LIKE '%79acf81c%'
   OR course_id::text LIKE '%be24%'
   OR course_id::text LIKE '%4de2%'
GROUP BY course_id;

-- 7. Check if the specific student grade item exists anywhere
SELECT 
    'Student Grade Item Anywhere' as check_type,
    id,
    title,
    course_id,
    is_active
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';

-- 8. Check all courses to see if there's a similar one
SELECT 
    'All Courses' as check_type,
    id,
    title,
    created_at
FROM courses 
WHERE title ILIKE '%digital%' 
   OR title ILIKE '%literacy%'
   OR title ILIKE '%innovators%'
ORDER BY created_at DESC;
