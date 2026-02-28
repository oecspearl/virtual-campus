-- Check constraints on course_grade_items table
-- This will help us understand what unique constraints exist

-- Show all constraints on course_grade_items table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'course_grade_items'::regclass
ORDER BY conname;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'course_grade_items'
ORDER BY ordinal_position;

-- Check for unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'course_grade_items';
