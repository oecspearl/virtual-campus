-- Add existing quizzes to gradebook that are missing grade items
-- This script will create gradebook items for quizzes that don't have them yet

-- First, let's see what we're working with
SELECT 
    'Quizzes without gradebook items' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  );

-- Show some examples
SELECT 
    'Example quizzes to add to gradebook' as status,
    q.id as quiz_id,
    q.title as quiz_title,
    l.course_id,
    c.title as course_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  )
LIMIT 10;

-- Create gradebook items for quizzes that don't have them
-- Using a safer approach without ON CONFLICT since we don't know the exact constraint
INSERT INTO course_grade_items (
    course_id,
    title,
    type,
    category,
    points,
    assessment_id,
    due_date,
    weight,
    is_active,
    created_at,
    updated_at
)
SELECT 
    l.course_id,
    q.title,
    'quiz' as type,
    'Quizzes' as category,
    COALESCE(q.points, 100) as points,
    q.id as assessment_id,
    q.due_date,
    1.0 as weight,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  );

-- Show results
SELECT 
    'After update - quizzes with gradebook items' as status,
    COUNT(*) as count
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.lesson_id IS NOT NULL 
  AND l.course_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM course_grade_items cgi 
    WHERE cgi.course_id = l.course_id 
      AND cgi.assessment_id = q.id 
      AND cgi.type = 'quiz'
  );

-- Show some examples of created gradebook items
SELECT 
    'Created gradebook items' as status,
    cgi.id as grade_item_id,
    cgi.title,
    cgi.points,
    cgi.assessment_id as quiz_id,
    c.title as course_title
FROM course_grade_items cgi
LEFT JOIN courses c ON cgi.course_id = c.id
WHERE cgi.type = 'quiz'
  AND cgi.created_at >= NOW() - INTERVAL '1 minute'
ORDER BY cgi.created_at DESC
LIMIT 10;
