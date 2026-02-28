-- Fix: Add assignment creator as course instructor
-- This will ensure that assignment creators can see their assignments in pending grading

-- First, let's see what courses exist and what instructors are set
SELECT 
  c.id as course_id,
  c.title as course_title,
  ci.instructor_id,
  u.email as instructor_email
FROM courses c
LEFT JOIN course_instructors ci ON c.id = ci.course_id
LEFT JOIN users u ON ci.instructor_id = u.id
ORDER BY c.title;

-- Add assignment creators as course instructors for their assignments
-- This ensures they can grade submissions for assignments they created
INSERT INTO course_instructors (course_id, instructor_id, created_at, updated_at)
SELECT DISTINCT 
  l.course_id,
  a.creator_id,
  NOW(),
  NOW()
FROM assignments a
JOIN lessons l ON a.lesson_id = l.id
WHERE a.creator_id IS NOT NULL
  AND l.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_instructors ci 
    WHERE ci.course_id = l.course_id 
    AND ci.instructor_id = a.creator_id
  );

-- Verify the fix worked
SELECT 
  c.title as course_title,
  ci.instructor_id,
  u.email as instructor_email,
  COUNT(a.id) as assignments_created
FROM courses c
JOIN course_instructors ci ON c.id = ci.course_id
JOIN users u ON ci.instructor_id = u.id
LEFT JOIN lessons l ON c.id = l.course_id
LEFT JOIN assignments a ON l.id = a.lesson_id AND a.creator_id = ci.instructor_id
GROUP BY c.id, c.title, ci.instructor_id, u.email
ORDER BY c.title;


















