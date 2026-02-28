-- Comprehensive debug for assignment submission issue
-- Replace 'YOUR_USER_ID' with your actual user ID
-- Replace 'YOUR_ASSIGNMENT_ID' with the assignment ID you submitted to

-- 1. Check your user info and role
SELECT 
  id,
  email,
  role,
  name
FROM users 
WHERE email = 'your-email@example.com'; -- Replace with your email

-- 2. Check the assignment you submitted to
SELECT 
  a.id,
  a.title,
  a.creator_id,
  a.lesson_id,
  a.published,
  a.created_at,
  l.course_id,
  c.title as course_title
FROM assignments a
LEFT JOIN lessons l ON a.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE a.id = 'YOUR_ASSIGNMENT_ID'; -- Replace with actual assignment ID

-- 3. Check your submission
SELECT 
  asub.id,
  asub.assignment_id,
  asub.student_id,
  asub.status,
  asub.submitted_at,
  asub.created_at,
  a.title as assignment_title
FROM assignment_submissions asub
LEFT JOIN assignments a ON asub.assignment_id = a.id
WHERE asub.student_id = 'YOUR_USER_ID' -- Replace with your user ID
ORDER BY asub.created_at DESC;

-- 4. Check if you're an instructor for the course
SELECT 
  ci.id,
  ci.course_id,
  ci.instructor_id,
  c.title as course_title
FROM course_instructors ci
LEFT JOIN courses c ON ci.course_id = c.id
WHERE ci.instructor_id = 'YOUR_USER_ID'; -- Replace with your user ID

-- 5. Check all assignment submissions with status 'submitted'
SELECT 
  asub.id,
  asub.assignment_id,
  asub.student_id,
  asub.status,
  asub.submitted_at,
  a.title as assignment_title,
  a.creator_id,
  a.lesson_id,
  l.course_id
FROM assignment_submissions asub
LEFT JOIN assignments a ON asub.assignment_id = a.id
LEFT JOIN lessons l ON a.lesson_id = l.id
WHERE asub.status = 'submitted'
ORDER BY asub.submitted_at DESC;
