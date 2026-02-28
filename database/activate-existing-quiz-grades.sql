-- Activate Existing Quiz Grades
-- This script will create gradebook items for quizzes that have attempts but no gradebook entries

-- 1. Find quizzes with attempts but no gradebook items
SELECT 
    'Quizzes with attempts but no gradebook items' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    q.course_id,
    COUNT(qa.id) as attempt_count,
    MAX(qa.submitted_at) as last_attempt
FROM quizzes q
JOIN quiz_attempts qa ON q.id = qa.quiz_id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
WHERE qa.status = 'graded'
AND cgi.id IS NULL
GROUP BY q.id, q.title, q.course_id
ORDER BY attempt_count DESC;

-- 2. Create gradebook items for these quizzes
-- Only insert if they don't already exist
INSERT INTO course_grade_items (
    course_id,
    title,
    type,
    category,
    points,
    assessment_id,
    weight,
    created_at,
    updated_at
)
SELECT DISTINCT
    q.course_id,
    q.title,
    'quiz',
    'Quizzes',
    COALESCE(q.points, 100),
    q.id,
    1.0,
    NOW(),
    NOW()
FROM quizzes q
JOIN quiz_attempts qa ON q.id = qa.quiz_id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
WHERE qa.status = 'graded'
AND cgi.id IS NULL
AND q.course_id IS NOT NULL;

-- 3. Now sync the existing grades
-- This will create course_grades entries for existing quiz attempts
-- Use UPSERT to handle duplicates gracefully
-- Only select the best attempt for each student-quiz combination
INSERT INTO course_grades (
    course_id,
    student_id,
    grade_item_id,
    score,
    max_score,
    percentage,
    graded_at,
    created_at,
    updated_at
)
SELECT 
    q.course_id,
    qa.student_id,
    cgi.id as grade_item_id,
    qa.score,
    qa.max_score,
    qa.percentage,
    qa.submitted_at,
    NOW(),
    NOW()
FROM (
    -- Get the best attempt for each student-quiz combination
    SELECT DISTINCT ON (qa.student_id, qa.quiz_id)
        qa.*
    FROM quiz_attempts qa
    WHERE qa.status = 'graded'
    ORDER BY qa.student_id, qa.quiz_id, qa.percentage DESC, qa.submitted_at DESC
) qa
JOIN quizzes q ON qa.quiz_id = q.id
JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
WHERE q.course_id IS NOT NULL
ON CONFLICT (student_id, grade_item_id) 
DO UPDATE SET
    score = EXCLUDED.score,
    max_score = EXCLUDED.max_score,
    percentage = EXCLUDED.percentage,
    graded_at = EXCLUDED.graded_at,
    updated_at = NOW();

-- 4. Show summary of what was created
SELECT 
    'Summary' as status,
    COUNT(DISTINCT cgi.id) as grade_items_created,
    COUNT(cg.id) as grades_created
FROM course_grade_items cgi
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz'
AND cgi.created_at >= NOW() - INTERVAL '1 minute';

-- 5. Show final status
SELECT 
    'Final Gradebook Status' as status,
    COUNT(DISTINCT cgi.id) as total_quiz_items,
    COUNT(cg.id) as total_grades
FROM course_grade_items cgi
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz';
