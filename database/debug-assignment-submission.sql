-- Debug assignment submission data
-- Check if there are any assignment submissions with status 'submitted'

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
  u.email as student_email
FROM assignment_submissions asub
LEFT JOIN assignments a ON asub.assignment_id = a.id
LEFT JOIN users u ON asub.student_id = u.id
ORDER BY asub.created_at DESC
LIMIT 10;

-- Check specific assignment submissions by status
SELECT 
  status,
  COUNT(*) as count
FROM assignment_submissions
GROUP BY status;

-- Check if there are any assignments that should have submissions
SELECT 
  a.id,
  a.title,
  a.creator_id,
  a.lesson_id,
  a.published,
  COUNT(asub.id) as submission_count
FROM assignments a
LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
WHERE a.published = true
GROUP BY a.id, a.title, a.creator_id, a.lesson_id, a.published
ORDER BY submission_count DESC
LIMIT 10;
