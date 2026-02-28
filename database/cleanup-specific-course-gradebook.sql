-- Cleanup Gradebook for Specific Course
-- This script targets the course with the assignments shown in the image

-- 1. First, let's identify the course and its orphaned items
SELECT 
    'Course Grade Items Check' as status,
    cgi.id,
    cgi.title,
    cgi.type,
    cgi.assessment_id,
    cgi.points,
    CASE 
        WHEN cgi.type = 'assignment' AND a.id IS NULL THEN 'DELETED_ASSIGNMENT'
        WHEN cgi.type = 'quiz' AND q.id IS NULL THEN 'DELETED_QUIZ'
        WHEN cgi.type = 'assignment' AND a.id IS NOT NULL THEN 'EXISTS_ASSIGNMENT'
        WHEN cgi.type = 'quiz' AND q.id IS NOT NULL THEN 'EXISTS_QUIZ'
        ELSE 'OTHER'
    END as status_check
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
WHERE cgi.title LIKE '%Mini Reflection Journal%' 
   OR cgi.title LIKE '%Website Evaluation%'
   OR cgi.title LIKE '%Misinformation Detective%'
   OR cgi.title LIKE '%Digital Ethics%'
ORDER BY cgi.title;

-- 2. Check if assignments exist in the assignments table
SELECT 
    'Assignments Check' as status,
    id,
    title,
    published,
    created_at
FROM assignments 
WHERE title LIKE '%Mini Reflection Journal%' 
   OR title LIKE '%Website Evaluation%'
   OR title LIKE '%Misinformation Detective%'
   OR title LIKE '%Digital Ethics%'
ORDER BY title;

-- 3. If the assignments don't exist, we need to clean up the gradebook items
-- First, let's get the IDs of the problematic grade items
WITH orphaned_items AS (
    SELECT cgi.id
    FROM course_grade_items cgi
    LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
    LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
    WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
       OR (cgi.type = 'quiz' AND q.id IS NULL)
)
-- Delete associated grades first
DELETE FROM course_grades 
WHERE grade_item_id IN (SELECT id FROM orphaned_items);

-- 4. Now delete the orphaned grade items
WITH orphaned_items AS (
    SELECT cgi.id
    FROM course_grade_items cgi
    LEFT JOIN assignments a ON cgi.assessment_id = a.id AND cgi.type = 'assignment'
    LEFT JOIN quizzes q ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
    WHERE (cgi.type = 'assignment' AND a.id IS NULL) 
       OR (cgi.type = 'quiz' AND q.id IS NULL)
)
DELETE FROM course_grade_items 
WHERE id IN (SELECT id FROM orphaned_items);

-- 5. Verify the cleanup
SELECT 
    'After Cleanup - Remaining Grade Items' as status,
    cgi.id,
    cgi.title,
    cgi.type,
    cgi.points,
    c.title as course_title
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
WHERE cgi.title LIKE '%Mini Reflection Journal%' 
   OR cgi.title LIKE '%Website Evaluation%'
   OR cgi.title LIKE '%Misinformation Detective%'
   OR cgi.title LIKE '%Digital Ethics%'
ORDER BY cgi.title;

-- 6. Show total grade items by course
SELECT 
    'Final Grade Items Count by Course' as status,
    cgi.course_id,
    c.title as course_title,
    COUNT(*) as total_items,
    SUM(cgi.points) as total_points
FROM course_grade_items cgi
JOIN courses c ON cgi.course_id = c.id
GROUP BY cgi.course_id, c.title
ORDER BY total_items DESC;
