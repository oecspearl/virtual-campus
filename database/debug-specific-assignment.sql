-- Check the specific assignment submission details
SELECT 
  asub.id,
  asub.assignment_id,
  asub.student_id,
  asub.status,
  asub.submitted_at,
  asub.created_at,
  a.title as assignment_title,
  a.creator_id,
  a.lesson_id,
  l.course_id,
  c.title as course_title,
  u.email as student_email
FROM assignment_submissions asub
LEFT JOIN assignments a ON asub.assignment_id = a.id
LEFT JOIN lessons l ON a.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
LEFT JOIN users u ON asub.student_id = u.id
WHERE asub.assignment_id = '1b80ae79-5730-40a4-a270-b4f7bbf9fffc'
ORDER BY asub.created_at DESC;

-- Check what course this lesson belongs to
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  l.course_id,
  c.title as course_title
FROM lessons l
LEFT JOIN courses c ON l.course_id = c.id
WHERE l.id = '4ba8f752-a8e5-4c04-aa99-99d6afcb95ca';

-- Check if the creator is an instructor for this course
SELECT 
  ci.id,
  ci.course_id,
  ci.instructor_id,
  c.title as course_title,
  u.email as instructor_email
FROM course_instructors ci
LEFT JOIN courses c ON ci.course_id = c.id
LEFT JOIN users u ON ci.instructor_id = u.id
WHERE ci.instructor_id = 'f0c2dcec-ba13-4e6d-b973-75559c842e97';


















