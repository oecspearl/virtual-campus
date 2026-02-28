-- Check if course_id column exists in lessons table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public'
ORDER BY ordinal_position;


























