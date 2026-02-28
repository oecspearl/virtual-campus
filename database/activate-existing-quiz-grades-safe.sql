-- Safe Activation of Existing Quiz Grades
-- This script safely creates gradebook items and grades for existing quiz attempts

-- 1. First, let's see what we're working with
SELECT 
    'Current Status' as status,
    COUNT(DISTINCT q.id) as quizzes_with_attempts,
    COUNT(DISTINCT cgi.id) as existing_grade_items,
    COUNT(DISTINCT cg.id) as existing_grades
FROM quizzes q
JOIN quiz_attempts qa ON q.id = qa.quiz_id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id
WHERE qa.status = 'graded'
AND q.course_id IS NOT NULL;

-- 2. Create gradebook items for quizzes that don't have them
-- This will only insert if the gradebook item doesn't exist
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

-- 3. Show what gradebook items were created
SELECT 
    'Gradebook Items Created' as status,
    COUNT(*) as items_created
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
AND cgi.created_at >= NOW() - INTERVAL '1 minute';

-- 4. Now create grades for quiz attempts that don't have them
-- This uses a more careful approach to avoid duplicates
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
AND NOT EXISTS (
    SELECT 1 FROM course_grades cg 
    WHERE cg.student_id = qa.student_id 
    AND cg.grade_item_id = cgi.id
);

-- 5. Show what grades were created
SELECT 
    'Grades Created' as status,
    COUNT(*) as grades_created
FROM course_grades cg
JOIN course_grade_items cgi ON cg.grade_item_id = cgi.id
WHERE cgi.type = 'quiz'
AND cg.created_at >= NOW() - INTERVAL '1 minute';

-- 6. Final summary
SELECT 
    'Final Status' as status,
    COUNT(DISTINCT cgi.id) as total_quiz_grade_items,
    COUNT(DISTINCT cg.id) as total_grades
FROM course_grade_items cgi
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz';

-- 7. Show any remaining issues
SELECT 
    'Remaining Issues' as status,
    COUNT(*) as quiz_attempts_without_grades
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
LEFT JOIN course_grade_items cgi ON q.id = cgi.assessment_id AND cgi.type = 'quiz'
LEFT JOIN course_grades cg ON cgi.id = cg.grade_item_id AND cg.student_id = qa.student_id
WHERE qa.status = 'graded'
AND q.course_id IS NOT NULL
AND (cgi.id IS NULL OR cg.id IS NULL);
