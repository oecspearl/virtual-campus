-- Debug Gradebook Integration
-- This script helps identify issues with quiz gradebook integration

-- 1. Check quiz attempts and their course associations
SELECT 
    'Quiz Attempts Status' as status,
    qa.id as attempt_id,
    q.title as quiz_title,
    q.course_id as quiz_course_id,
    qa.course_id as attempt_course_id,
    qa.student_id,
    qa.score,
    qa.max_score,
    qa.percentage,
    qa.status,
    qa.submitted_at
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
WHERE qa.status = 'graded'
ORDER BY qa.submitted_at DESC
LIMIT 10;

-- 2. Check gradebook items for quizzes
SELECT 
    'Gradebook Items for Quizzes' as status,
    cgi.id as grade_item_id,
    cgi.title,
    cgi.assessment_id as quiz_id,
    cgi.course_id,
    cgi.points,
    cgi.created_at
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
ORDER BY cgi.created_at DESC;

-- 3. Check course_grades for quiz items
SELECT 
    'Course Grades for Quizzes' as status,
    cg.id as grade_id,
    cg.student_id,
    cg.score,
    cg.max_score,
    cg.percentage,
    cgi.title as grade_item_title,
    cgi.assessment_id as quiz_id,
    cg.created_at
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz'
ORDER BY cg.created_at DESC
LIMIT 10;

-- 4. Find mismatches - quiz attempts without gradebook entries
SELECT 
    'Quiz Attempts Without Gradebook Entries' as status,
    qa.id as attempt_id,
    q.title as quiz_title,
    q.course_id,
    qa.student_id,
    qa.score,
    qa.status,
    qa.submitted_at
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
WHERE qa.status = 'graded'
AND cgi.id IS NULL
ORDER BY qa.submitted_at DESC;

-- 5. Find gradebook items without grades
SELECT 
    'Gradebook Items Without Grades' as status,
    cgi.id as grade_item_id,
    cgi.title,
    cgi.assessment_id as quiz_id,
    cgi.course_id,
    COUNT(cg.id) as grade_count
FROM course_grade_items cgi
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz'
GROUP BY cgi.id, cgi.title, cgi.assessment_id, cgi.course_id
HAVING COUNT(cg.id) = 0
ORDER BY cgi.created_at DESC;

-- 6. Check for course_id mismatches
SELECT 
    'Course ID Mismatches' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.course_id as quiz_course_id,
    qa.course_id as attempt_course_id,
    cgi.course_id as grade_item_course_id
FROM quizzes q
JOIN quiz_attempts qa ON q.id = qa.quiz_id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
WHERE qa.status = 'graded'
AND (q.course_id != qa.course_id OR qa.course_id != cgi.course_id)
ORDER BY qa.submitted_at DESC;
