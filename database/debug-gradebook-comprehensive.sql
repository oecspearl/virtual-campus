-- Comprehensive Gradebook Debug
-- This script will help identify why gradebook items aren't showing

-- 1. Check if course_grade_items table exists and its structure
SELECT 
    'Table Structure' as check_type,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'course_grade_items'
ORDER BY ordinal_position;

-- 2. Check if there are ANY gradebook items for this course
SELECT 
    'Course Grade Items' as check_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN course_id = '79acf81c-be24-4de2-a392-04cba13998d6' THEN 1 END) as items_for_course
FROM course_grade_items;

-- 3. Show all gradebook items for this specific course
SELECT 
    'Specific Course Items' as check_type,
    id,
    title,
    type,
    points,
    course_id,
    created_at,
    is_active
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
ORDER BY created_at;

-- 4. Check the specific grade item that the student has a grade for
SELECT 
    'Student Grade Item' as check_type,
    id,
    title,
    type,
    points,
    course_id,
    created_at,
    is_active
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';

-- 5. Check if there are any gradebook items at all in the system
SELECT 
    'All Grade Items' as check_type,
    COUNT(*) as total_items,
    COUNT(DISTINCT course_id) as unique_courses
FROM course_grade_items;

-- 6. Show sample gradebook items from any course
SELECT 
    'Sample Items' as check_type,
    id,
    title,
    type,
    points,
    course_id,
    created_at,
    is_active
FROM course_grade_items 
ORDER BY created_at DESC
LIMIT 5;
