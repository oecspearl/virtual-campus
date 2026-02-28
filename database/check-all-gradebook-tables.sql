-- Check All Gradebook Related Tables
-- This script will check all tables that might contain gradebook data

-- 1. List all tables that might contain gradebook data
SELECT 
    'All Tables' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (
    table_name LIKE '%grade%' 
    OR table_name LIKE '%course%'
    OR table_name LIKE '%item%'
)
ORDER BY table_name;

-- 2. Check if course_grade_items table exists
SELECT 
    'Table Exists Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'course_grade_items'
        ) THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as table_status;

-- 3. If table exists, check its data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'course_grade_items'
    ) THEN
        RAISE NOTICE 'course_grade_items table exists';
        
        -- Show count of items for this course
        PERFORM COUNT(*) FROM course_grade_items 
        WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';
        
        -- Show the specific item the student has a grade for
        PERFORM COUNT(*) FROM course_grade_items 
        WHERE id = '17d6ab96-8652-465e-8fe2-f7e1e94e157e';
        
    ELSE
        RAISE NOTICE 'course_grade_items table does NOT exist';
    END IF;
END $$;

-- 4. Check if there are any other tables with grade data
SELECT 
    'Other Grade Tables' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%grade%'
AND table_name != 'course_grade_items';

-- 5. Check course_grades table structure
SELECT 
    'course_grades Structure' as check_type,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_grades'
ORDER BY ordinal_position;
