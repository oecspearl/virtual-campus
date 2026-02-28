-- Activate Gradebook Items
-- This script will activate all gradebook items for the course

-- 1. Check current status of gradebook items
SELECT 
    'Current Status' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_active = true THEN 1 END) as activated_items,
    COUNT(CASE WHEN is_active = false OR is_active IS NULL THEN 1 END) as inactive_items
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';

-- 2. Show specific items
SELECT 
    id,
    title,
    type,
    points,
    is_active,
    created_at
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
ORDER BY created_at;

-- 3. Activate all gradebook items for this course
UPDATE course_grade_items 
SET is_active = true 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
AND (is_active = false OR is_active IS NULL);

-- 4. Verify the activation
SELECT 
    'After Activation' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_active = true THEN 1 END) as activated_items,
    COUNT(CASE WHEN is_active = false OR is_active IS NULL THEN 1 END) as inactive_items
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';

-- 5. Show activated items
SELECT 
    id,
    title,
    type,
    points,
    is_active,
    created_at
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
AND is_active = true
ORDER BY created_at;
