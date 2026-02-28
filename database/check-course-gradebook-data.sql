-- Check Course Gradebook Data
-- This script will check what data exists for the specific course

-- 1. Check if there are ANY gradebook items for this course
SELECT 
    'Course Grade Items Count' as check_type,
    COUNT(*) as total_items
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';

-- 2. Show all gradebook items for this course
SELECT 
    'Course Grade Items' as check_type,
    id,
    title,
    type,
    category,
    points,
    assessment_id,
    is_active,
    created_at
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
ORDER BY created_at;

-- 3. Check the specific grade item that the student has a grade for
SELECT 
    'Student Grade Item' as check_type,
    id,
    title,
    type,
    category,
    points,
    assessment_id,
    is_active,
    course_id,
    created_at
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';

-- 4. Check if there are any gradebook items at all in the system
SELECT 
    'All Grade Items Count' as check_type,
    COUNT(*) as total_items,
    COUNT(DISTINCT course_id) as unique_courses
FROM course_grade_items;

-- 5. Show sample gradebook items from any course
SELECT 
    'Sample Items' as check_type,
    id,
    title,
    type,
    category,
    points,
    course_id,
    is_active,
    created_at
FROM course_grade_items 
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if the student's grade item exists but is inactive
SELECT 
    'Inactive Grade Item Check' as check_type,
    id,
    title,
    type,
    is_active,
    course_id
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e'
AND is_active = false;
