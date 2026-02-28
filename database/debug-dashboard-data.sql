-- Debug Dashboard Data Issues
-- Check what data exists for assignments and discussions

-- 1. Check assignments table structure and data
SELECT 
    'Assignments Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;

-- 2. Check if assignments have course_id
SELECT 
    'Assignments with course_id' as check_type,
    COUNT(*) as total_assignments,
    COUNT(course_id) as with_course_id,
    COUNT(*) - COUNT(course_id) as without_course_id
FROM assignments;

-- 3. Check assignments linked through lessons
SELECT 
    'Assignments via lessons' as check_type,
    COUNT(*) as total_assignments,
    COUNT(lesson_id) as with_lesson_id,
    COUNT(*) - COUNT(lesson_id) as without_lesson_id
FROM assignments;

-- 4. Check discussions table structure
SELECT 
    'Discussions Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'discussions' 
ORDER BY ordinal_position;

-- 5. Check discussions data
SELECT 
    'Discussions Data' as check_type,
    COUNT(*) as total_discussions,
    COUNT(course_id) as with_course_id,
    COUNT(*) - COUNT(course_id) as without_course_id
FROM discussions;

-- 6. Check lesson discussions
SELECT 
    'Lesson Discussions' as check_type,
    COUNT(*) as total_lesson_discussions
FROM lesson_discussions;

-- 7. Sample assignments data
SELECT 
    'Sample Assignments' as check_type,
    id,
    title,
    course_id,
    lesson_id,
    published,
    due_date
FROM assignments 
LIMIT 5;

-- 8. Sample discussions data
SELECT 
    'Sample Discussions' as check_type,
    id,
    title,
    course_id,
    published,
    created_at
FROM discussions 
LIMIT 5;
