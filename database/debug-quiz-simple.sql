-- Simple debug for quiz 317c486e-3ece-42fe-a8ff-c9f539b1a683
SELECT 
    q.id,
    q.title,
    q.lesson_id,
    q.course_id,
    q.attempts_allowed,
    l.course_id as lesson_course_id,
    l.title as lesson_title
FROM quizzes q
LEFT JOIN lessons l ON q.lesson_id = l.id
WHERE q.id = '317c486e-3ece-42fe-a8ff-c9f539b1a683';
