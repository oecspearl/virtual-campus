-- ==============================================
-- DIAGNOSE MISSING GRADES ISSUE
-- Run this to check what's happening with gradebook data
-- ==============================================

-- 1. Check if course_grade_items exist
SELECT 'course_grade_items count' as check_name, COUNT(*) as count FROM public.course_grade_items;

-- 2. Check if course_grades (student scores) exist
SELECT 'course_grades count' as check_name, COUNT(*) as count FROM public.course_grades;

-- 3. Check grade items by type
SELECT
    type,
    is_active,
    COUNT(*) as count
FROM public.course_grade_items
GROUP BY type, is_active
ORDER BY type, is_active;

-- 4. Check if there are orphaned grades (grades referencing non-existent grade items)
SELECT
    'orphaned_grades' as check_name,
    COUNT(*) as count
FROM public.course_grades cg
WHERE NOT EXISTS (
    SELECT 1 FROM public.course_grade_items cgi
    WHERE cgi.id = cg.grade_item_id
);

-- 5. Check sample grade items with their associated quiz existence
SELECT
    cgi.id as grade_item_id,
    cgi.title,
    cgi.type,
    cgi.assessment_id,
    cgi.is_active,
    CASE WHEN q.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as quiz_status
FROM public.course_grade_items cgi
LEFT JOIN public.quizzes q ON q.id = cgi.assessment_id
WHERE cgi.type = 'quiz'
LIMIT 20;

-- 6. Check sample course_grades records
SELECT
    cg.id,
    cg.student_id,
    cg.grade_item_id,
    cg.score,
    cg.max_score,
    cg.percentage,
    cgi.title as grade_item_title,
    cgi.is_active
FROM public.course_grades cg
LEFT JOIN public.course_grade_items cgi ON cgi.id = cg.grade_item_id
LIMIT 20;

-- 7. Check foreign key constraints on course_grades table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'course_grades'
  AND tc.constraint_type = 'FOREIGN KEY';
