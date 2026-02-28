-- Quick Verification Script for Quiz Grades Fix
-- Run this in your Supabase SQL editor to check if the fix is working

-- 1. Check if grade item points match calculated question totals
SELECT 
    cgi.id as grade_item_id,
    cgi.title as quiz_title,
    cgi.points as grade_item_points,
    (SELECT COALESCE(SUM(points), 0) 
     FROM questions 
     WHERE quiz_id = cgi.assessment_id) as calculated_points,
    CASE 
        WHEN cgi.points = (SELECT COALESCE(SUM(points), 0) 
                          FROM questions 
                          WHERE quiz_id = cgi.assessment_id) 
        THEN '✅ MATCH' 
        ELSE '❌ MISMATCH - Needs Update' 
    END as status
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
  AND cgi.assessment_id IS NOT NULL
ORDER BY cgi.created_at DESC
LIMIT 20;

-- 2. Check if grades have correct max_score matching grade item points
SELECT 
    cg.id as grade_id,
    cg.score,
    cg.max_score,
    cg.percentage,
    cgi.points as grade_item_points,
    CASE 
        WHEN cg.max_score = cgi.points THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as max_score_status,
    ROUND((cg.score::numeric / NULLIF(cgi.points, 0) * 100)::numeric, 2) as expected_percentage,
    CASE 
        WHEN cgi.points > 0 AND ABS(cg.percentage - (cg.score::numeric / cgi.points * 100)) < 0.01 
        THEN '✅ CORRECT' 
        ELSE '❌ INCORRECT' 
    END as percentage_status
FROM course_grades cg
JOIN course_grade_items cgi ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz'
ORDER BY cg.updated_at DESC
LIMIT 20;

-- 3. Summary: Count of mismatches
SELECT 
    COUNT(*) FILTER (WHERE cgi.points != (
        SELECT COALESCE(SUM(points), 0) 
        FROM questions 
        WHERE quiz_id = cgi.assessment_id
    )) as grade_items_with_mismatched_points,
    COUNT(*) as total_quiz_grade_items
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
  AND cgi.assessment_id IS NOT NULL;

-- 4. Find specific quizzes that need attention
SELECT 
    q.id as quiz_id,
    q.title,
    q.points as quiz_points_field,
    COUNT(qu.id) as question_count,
    COALESCE(SUM(qu.points), 0) as calculated_total,
    cgi.id as grade_item_id,
    cgi.points as grade_item_points,
    CASE 
        WHEN cgi.points != COALESCE(SUM(qu.points), 0) THEN '⚠️ NEEDS UPDATE'
        ELSE '✅ OK'
    END as status
FROM quizzes q
LEFT JOIN questions qu ON qu.quiz_id = q.id
LEFT JOIN course_grade_items cgi ON cgi.assessment_id = q.id AND cgi.type = 'quiz'
GROUP BY q.id, q.title, q.points, cgi.id, cgi.points
HAVING COUNT(qu.id) > 0
ORDER BY 
    CASE 
        WHEN cgi.points != COALESCE(SUM(qu.points), 0) THEN 0 
        ELSE 1 
    END,
    q.created_at DESC
LIMIT 10;



