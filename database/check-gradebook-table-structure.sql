-- Check Gradebook Table Structure
-- This script will show the actual structure of the course_grade_items table

-- 1. Check if the table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'course_grade_items';

-- 2. Show all columns in the course_grade_items table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'course_grade_items'
ORDER BY ordinal_position;

-- 3. Show sample data from the table
SELECT * 
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6'
LIMIT 5;

-- 4. Check if there are any gradebook items for this course
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN course_id = '79acf81c-be24-4de2-a392-04cba13998d6' THEN 1 END) as items_for_course
FROM course_grade_items;
