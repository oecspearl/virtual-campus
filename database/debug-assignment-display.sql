-- Debug why assignment badb56fe-e8df-4ff7-8824-a1e2544d1670 isn't showing in student dashboard

-- 1. Check assignment basic info
SELECT 
    id,
    title,
    published,
    course_id,
    lesson_id,
    due_date,
    created_at,
    updated_at
FROM assignments 
WHERE id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670';

-- 2. Check if assignment has a course_id
SELECT 
    a.id,
    a.title,
    a.published,
    a.course_id,
    c.title as course_title
FROM assignments a
LEFT JOIN courses c ON a.course_id = c.id
WHERE a.id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670';

-- 3. Check if assignment has a lesson_id and what course that lesson belongs to
SELECT 
    a.id,
    a.title,
    a.published,
    a.lesson_id,
    l.title as lesson_title,
    l.course_id,
    c.title as course_title
FROM assignments a
LEFT JOIN lessons l ON a.lesson_id = l.id
LEFT JOIN courses c ON l.course_id = c.id
WHERE a.id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670';

-- 4. Check if student is enrolled in any course that might contain this assignment
-- (Replace 'STUDENT_ID_HERE' with actual student ID)
SELECT 
    e.*,
    c.title as course_title
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.student_id = 'STUDENT_ID_HERE'
  AND e.status = 'active';

-- 5. Check if assignment has any submissions from any student
SELECT 
    id,
    assignment_id,
    student_id,
    status,
    submitted_at
FROM assignment_submissions
WHERE assignment_id = 'badb56fe-e8df-4ff7-8824-a1e2544d1670'
LIMIT 5;

