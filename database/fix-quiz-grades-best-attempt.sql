-- Fix existing quiz grades to use the best attempt instead of most recent
-- This script will update all existing grades to use the highest scoring attempt

-- First, let's see what we're working with
SELECT 
    'Current Gradebook Status' as status,
    COUNT(*) as total_grades,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT grade_item_id) as unique_quizzes
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz';

-- Show some examples of current grades
SELECT 
    'Current Grades Examples' as status,
    cg.student_id,
    cgi.title as quiz_title,
    cg.score,
    cg.max_score,
    cg.percentage,
    cg.graded_at
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz'
ORDER BY cg.updated_at DESC
LIMIT 10;

-- Update grades to use the best attempt for each student-quiz combination
UPDATE course_grades 
SET 
    score = best_attempt.score,
    max_score = best_attempt.max_score,
    percentage = best_attempt.percentage,
    graded_at = best_attempt.submitted_at,
    updated_at = NOW()
FROM (
    -- Get the best attempt for each student-quiz combination
    SELECT DISTINCT ON (qa.student_id, qa.quiz_id)
        qa.student_id,
        qa.quiz_id,
        qa.score,
        qa.max_score,
        qa.percentage,
        qa.submitted_at,
        cgi.id as grade_item_id
    FROM quiz_attempts qa
    JOIN course_grade_items cgi ON qa.quiz_id = cgi.assessment_id AND cgi.type = 'quiz'
    WHERE qa.status = 'graded'
    ORDER BY qa.student_id, qa.quiz_id, qa.percentage DESC, qa.submitted_at DESC
) best_attempt
WHERE course_grades.student_id = best_attempt.student_id
  AND course_grades.grade_item_id = best_attempt.grade_item_id
  AND course_grades.percentage != best_attempt.percentage; -- Only update if percentage changed

-- Show results after update
SELECT 
    'After Update - Updated Grades' as status,
    COUNT(*) as grades_updated
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz'
  AND cg.updated_at >= NOW() - INTERVAL '1 minute';

-- Show some examples of updated grades
SELECT 
    'Updated Grades Examples' as status,
    cg.student_id,
    cgi.title as quiz_title,
    cg.score,
    cg.max_score,
    cg.percentage,
    cg.graded_at,
    cg.updated_at
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz'
  AND cg.updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY cg.updated_at DESC
LIMIT 10;

-- Show final status
SELECT 
    'Final Gradebook Status' as status,
    COUNT(*) as total_grades,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT grade_item_id) as unique_quizzes,
    ROUND(AVG(percentage), 2) as average_percentage
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz';
