-- Cleanup Orphaned Gradebook Items
-- This script removes gradebook items that reference deleted assignments or quizzes

-- 1. First, let's see what orphaned items exist
SELECT 
    'Orphaned Grade Items' as status,
    cgi.id,
    cgi.title,
    cgi.type,
    cgi.assessment_id,
    cgi.course_id,
    c.title as course_title,
    CASE 
        WHEN cgi.type = 'assignment' AND a.id IS NULL THEN 'DELETED_ASSIGNMENT'
        WHEN cgi.type = 'quiz' AND q.id IS NULL THEN 'DELETED_QUIZ'
        ELSE 'EXISTS'
    END as status_check
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
   OR (cgi.type = 'quiz' AND q.id IS NULL)
ORDER BY cgi.course_id, cgi.title;

-- 2. Count orphaned items by course
SELECT 
    'Orphaned Items by Course' as status,
    cgi.course_id,
    c.title as course_title,
    COUNT(*) as orphaned_count
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
   OR (cgi.type = 'quiz' AND q.id IS NULL)
GROUP BY cgi.course_id, c.title
ORDER BY orphaned_count DESC;

-- 3. Delete orphaned grade items and their associated grades
-- First, delete the grades
DELETE FROM course_grades 
WHERE grade_item_id IN (
    SELECT cgi.id
    FROM course_grade_items cgi
    LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
    LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
    WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
       OR (cgi.type = 'quiz' AND q.id IS NULL)
);

-- Then, delete the grade items
DELETE FROM course_grade_items 
WHERE id IN (
    SELECT cgi.id
    FROM course_grade_items cgi
    LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
    LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
    WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
       OR (cgi.type = 'quiz' AND q.id IS NULL)
);

-- 4. Verify cleanup
SELECT 
    'After Cleanup' as status,
    COUNT(*) as remaining_grade_items
FROM course_grade_items;

-- 5. Show remaining grade items by course
SELECT 
    'Remaining Grade Items by Course' as status,
    cgi.course_id,
    c.title as course_title,
    COUNT(*) as item_count,
    SUM(cgi.points) as total_points
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
GROUP BY cgi.course_id, c.title
ORDER BY item_count DESC;
