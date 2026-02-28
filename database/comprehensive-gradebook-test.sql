-- Comprehensive Gradebook Test Script
-- This script tests all aspects of the gradebook functionality

-- 1. Check if all required tables exist and have proper structure
SELECT '=== TABLE STRUCTURE CHECK ===' as test_section;

-- Check course_grade_items table
SELECT 'course_grade_items columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_grade_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check course_grades table
SELECT 'course_grades columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_grades' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quiz_attempts table
SELECT 'quiz_attempts columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for missing course_id in quizzes
SELECT '=== QUIZ COURSE LINKING CHECK ===' as test_section;

SELECT 
    'Quizzes without course_id:' as status,
    COUNT(*) as count
FROM quizzes 
WHERE course_id IS NULL;

SELECT 
    'Quizzes with course_id:' as status,
    COUNT(*) as count
FROM quizzes 
WHERE course_id IS NOT NULL;

-- Show some examples
SELECT 
    'Sample quizzes:' as status,
    id,
    title,
    course_id,
    lesson_id
FROM quizzes 
LIMIT 5;

-- 3. Check gradebook items
SELECT '=== GRADEBOOK ITEMS CHECK ===' as test_section;

SELECT 
    'Total gradebook items:' as status,
    COUNT(*) as count
FROM course_grade_items;

SELECT 
    'Active gradebook items:' as status,
    COUNT(*) as count
FROM course_grade_items 
WHERE is_active = true;

SELECT 
    'Inactive gradebook items:' as status,
    COUNT(*) as count
FROM course_grade_items 
WHERE is_active = false;

-- Check by type
SELECT 
    'Gradebook items by type:' as status,
    type,
    COUNT(*) as count
FROM course_grade_items 
GROUP BY type;

-- 4. Check quiz attempts and grades
SELECT '=== QUIZ ATTEMPTS AND GRADES CHECK ===' as test_section;

SELECT 
    'Total quiz attempts:' as status,
    COUNT(*) as count
FROM quiz_attempts;

SELECT 
    'Graded quiz attempts:' as status,
    COUNT(*) as count
FROM quiz_attempts 
WHERE status = 'graded';

SELECT 
    'Quiz attempts by status:' as status,
    status,
    COUNT(*) as count
FROM quiz_attempts 
GROUP BY status;

-- Check for attempts without course_id
SELECT 
    'Quiz attempts without course_id:' as status,
    COUNT(*) as count
FROM quiz_attempts 
WHERE course_id IS NULL;

-- 5. Check course_grades
SELECT '=== COURSE GRADES CHECK ===' as test_section;

SELECT 
    'Total course grades:' as status,
    COUNT(*) as count
FROM course_grades;

-- Check grades by type
SELECT 
    'Course grades by grade item type:' as status,
    cgi.type,
    COUNT(*) as count
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
GROUP BY cgi.type;

-- 6. Check for orphaned data
SELECT '=== ORPHANED DATA CHECK ===' as test_section;

-- Grade items without corresponding quizzes/assignments
SELECT 
    'Orphaned quiz grade items:' as status,
    COUNT(*) as count
FROM course_grade_items cgi
WHERE cgi.type = 'quiz' 
  AND cgi.assessment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.id = cgi.assessment_id
  );

SELECT 
    'Orphaned assignment grade items:' as status,
    COUNT(*) as count
FROM course_grade_items cgi
WHERE cgi.type = 'assignment' 
  AND cgi.assessment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assignments a WHERE a.id = cgi.assessment_id
  );

-- Grades without corresponding grade items
SELECT 
    'Grades without grade items:' as status,
    COUNT(*) as count
FROM course_grades cg
WHERE NOT EXISTS (
  SELECT 1 FROM course_grade_items cgi WHERE cgi.id = cg.grade_item_id
);

-- 7. Check for duplicate grade items
SELECT '=== DUPLICATE CHECK ===' as test_section;

SELECT 
    'Duplicate grade items:' as status,
    course_id,
    assessment_id,
    type,
    COUNT(*) as count
FROM course_grade_items 
WHERE assessment_id IS NOT NULL
GROUP BY course_id, assessment_id, type
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 8. Sample data for testing
SELECT '=== SAMPLE DATA FOR TESTING ===' as test_section;

-- Sample quiz with attempts
SELECT 
    'Sample quiz with attempts:' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.course_id,
    COUNT(qa.id) as attempt_count,
    COUNT(CASE WHEN qa.status = 'graded' THEN 1 END) as graded_count
FROM quizzes q
LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
WHERE q.course_id IS NOT NULL
GROUP BY q.id, q.title, q.course_id
HAVING COUNT(qa.id) > 0
LIMIT 3;

-- Sample gradebook items
SELECT 
    'Sample gradebook items:' as status,
    cgi.id,
    cgi.title,
    cgi.type,
    cgi.points,
    cgi.is_active,
    cgi.assessment_id
FROM course_grade_items cgi
LIMIT 5;

-- Sample course grades
SELECT 
    'Sample course grades:' as status,
    cg.id,
    cg.student_id,
    cg.score,
    cg.max_score,
    cg.percentage,
    cgi.title as item_title,
    cgi.type as item_type
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
LIMIT 5;

-- 9. Test specific quiz for debugging
SELECT '=== SPECIFIC QUIZ TEST ===' as test_section;

-- Find a quiz with attempts to test
WITH test_quiz AS (
  SELECT q.id, q.title, q.course_id
  FROM quizzes q
  WHERE q.course_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status = 'graded')
  LIMIT 1
)
SELECT 
    'Test quiz details:' as status,
    tq.id as quiz_id,
    tq.title,
    tq.course_id,
    COUNT(qa.id) as total_attempts,
    COUNT(CASE WHEN qa.status = 'graded' THEN 1 END) as graded_attempts,
    MAX(qa.percentage) as best_percentage,
    MAX(qa.score) as best_score
FROM test_quiz tq
LEFT JOIN quiz_attempts qa ON tq.id = qa.quiz_id
GROUP BY tq.id, tq.title, tq.course_id;

-- Check if this quiz has a gradebook item
WITH test_quiz AS (
  SELECT q.id, q.title, q.course_id
  FROM quizzes q
  WHERE q.course_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status = 'graded')
  LIMIT 1
)
SELECT 
    'Test quiz gradebook item:' as status,
    tq.id as quiz_id,
    cgi.id as grade_item_id,
    cgi.title as grade_item_title,
    cgi.is_active,
    COUNT(cg.id) as grade_count
FROM test_quiz tq
LEFT JOIN course_grade_items cgi ON cgi.assessment_id = tq.id AND cgi.type = 'quiz'
LEFT JOIN course_grades cg ON cg.grade_item_id = cgi.id
GROUP BY tq.id, cgi.id, cgi.title, cgi.is_active;
