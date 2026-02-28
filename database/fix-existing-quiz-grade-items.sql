-- One-time migration script to fix existing quiz grade items
-- This updates all quiz grade items to use the calculated total from questions
-- and updates all related grades with correct max_score and percentage

-- Step 1: Update grade items with correct points
UPDATE course_grade_items cgi
SET 
    points = COALESCE((
        SELECT SUM(points) 
        FROM questions 
        WHERE quiz_id = cgi.assessment_id
    ), cgi.points),
    updated_at = NOW()
WHERE cgi.type = 'quiz'
  AND cgi.assessment_id IS NOT NULL
  AND cgi.points != COALESCE((
        SELECT SUM(points) 
        FROM questions 
        WHERE quiz_id = cgi.assessment_id
    ), cgi.points);

-- Step 2: Update all grades with correct max_score and recalculated percentage
UPDATE course_grades cg
SET 
    max_score = cgi.points,
    percentage = CASE 
        WHEN cgi.points > 0 THEN ROUND((cg.score::numeric / cgi.points * 100)::numeric, 2)
        ELSE 0
    END,
    updated_at = NOW()
FROM course_grade_items cgi
WHERE cg.grade_item_id = cgi.id
  AND cgi.type = 'quiz'
  AND (cg.max_score != cgi.points OR 
       ABS(cg.percentage - (cg.score::numeric / NULLIF(cgi.points, 0) * 100)) > 0.01);

-- Step 3: Show summary of what was updated
SELECT 
    'Grade Items Updated' as action,
    COUNT(*) as count
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
  AND cgi.assessment_id IS NOT NULL
  AND cgi.updated_at >= NOW() - INTERVAL '1 minute';

SELECT 
    'Grades Updated' as action,
    COUNT(*) as count
FROM course_grades cg
JOIN course_grade_items cgi ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz'
  AND cg.updated_at >= NOW() - INTERVAL '1 minute';

