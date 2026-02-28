-- Debug Specific Course Items
-- This script will show the 6 gradebook items for the course

-- 1. Show all 6 gradebook items for this course
SELECT 
    'All Course Items' as check_type,
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

-- 2. Check if any items are inactive
SELECT 
    'Inactive Items' as check_type,
    COUNT(*) as inactive_count
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
AND is_active = false;

-- 3. Show only active items
SELECT 
    'Active Items' as check_type,
    id,
    title,
    type,
    category,
    points,
    is_active
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
AND is_active = true
ORDER BY created_at;

-- 4. Check if the student's specific grade item is among the 6
SELECT 
    'Student Grade Item Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM course_grade_items 
            WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
            AND id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e'
        ) THEN 'EXISTS in course'
        ELSE 'NOT in course'
    END as item_status;

-- 5. Show the specific item if it exists
SELECT 
    'Specific Item' as check_type,
    id,
    title,
    type,
    category,
    points,
    is_active,
    course_id
FROM course_grade_items 
WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';
