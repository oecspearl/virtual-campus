-- Add is_active column to course_grade_items table
-- This script will add the missing is_active column

-- 1. Check if is_active column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'course_grade_items' 
AND column_name = 'is_active';

-- 2. Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_grade_items' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE course_grade_items 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Set all existing items to active
        UPDATE course_grade_items 
        SET is_active = true 
        WHERE is_active IS NULL;
        
        RAISE NOTICE 'Added is_active column to course_grade_items table';
    ELSE
        RAISE NOTICE 'is_active column already exists in course_grade_items table';
    END IF;
END $$;

-- 3. Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'course_grade_items'
AND column_name = 'is_active';

-- 4. Show current status of gradebook items
SELECT 
    'Current Status' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_active = true THEN 1 END) as activated_items,
    COUNT(CASE WHEN is_active = false THEN 1 END) as deactivated_items,
    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_items
FROM course_grade_items 
WHERE course_id = '79acf81c-be24-4de2-a392-04cba13998d6';
