-- Fix quiz course_id issue
-- This will set a course_id for quizzes that don't have one

-- First, let's see what quizzes exist and their course_id status
SELECT id, title, course_id, lesson_id FROM quizzes;

-- If you have courses, you can set the course_id for quizzes
-- Replace 'your-course-id-here' with an actual course ID from your courses table
-- UPDATE quizzes 
-- SET course_id = 'your-course-id-here'
-- WHERE course_id IS NULL;

-- Or, if you want to create a test course first:
-- INSERT INTO courses (id, title, description, instructor_id, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'Test Course',
--   'A test course for quiz attempts',
--   (SELECT id FROM users LIMIT 1),
--   NOW(),
--   NOW()
-- );

-- Then update quizzes to use this course:
-- UPDATE quizzes 
-- SET course_id = (SELECT id FROM courses WHERE title = 'Test Course' LIMIT 1)
-- WHERE course_id IS NULL;
