-- Simple Quiz Fix - Works with current schema
-- This script creates a working quiz system without complex schema changes

-- 1. First, let's disable RLS temporarily to fix the data issues
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;

-- 2. Create a test course if none exists
INSERT INTO courses (id, title, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Test Course',
    'A test course for quiz attempts',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 1);

-- 3. Get the test course ID and create test data
DO $$
DECLARE
    test_course_id UUID;
    test_user_id UUID;
    test_quiz_id UUID;
BEGIN
    -- Get the test course ID
    SELECT id INTO test_course_id FROM courses WHERE title = 'Test Course' LIMIT 1;
    
    -- Get the first user ID
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- Add the user as instructor for the test course
    INSERT INTO course_instructors (course_id, instructor_id, created_at)
    VALUES (test_course_id, test_user_id, NOW())
    ON CONFLICT (course_id, instructor_id) DO NOTHING;
    
    -- Create a test quiz (using the original schema without course_id)
    INSERT INTO quizzes (
        id, title, description, instructions, 
        creator_id, published, 
        attempts_allowed, points, 
        show_correct_answers, show_feedback,
        randomize_questions, randomize_answers,
        created_at, updated_at
    )
    VALUES (
        gen_random_uuid(),
        'Test Quiz',
        'A test quiz for debugging',
        'Answer all questions correctly',
        test_user_id,
        true,
        3,
        100,
        true,
        'after_submit',
        false,
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_quiz_id;
    
    -- If no quiz was created (conflict), get the existing one
    IF test_quiz_id IS NULL THEN
        SELECT id INTO test_quiz_id FROM quizzes WHERE title = 'Test Quiz' LIMIT 1;
    END IF;
    
    -- Create a test question
    INSERT INTO questions (
        id, quiz_id, question_text, type, points, 
        options, correct_answer, "order",
        feedback_correct, feedback_incorrect,
        created_at, updated_at
    )
    VALUES (
        gen_random_uuid(),
        test_quiz_id,
        'What is 2 + 2?',
        'multiple_choice',
        10,
        '["3", "4", "5", "6"]'::jsonb,
        '["4"]'::jsonb,
        1,
        'Correct!',
        'Incorrect. The answer is 4.',
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;
    
    -- Show the created quiz ID
    RAISE NOTICE 'Created quiz with ID: %', test_quiz_id;
END $$;

-- 4. Re-enable RLS with permissive policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can update questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can delete questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Authenticated users can create questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;
DROP POLICY IF EXISTS "Quiz creators can update questions" ON questions;
DROP POLICY IF EXISTS "Quiz creators can delete questions" ON questions;

DROP POLICY IF EXISTS "Users can create quiz attempts for enrolled courses" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Authenticated users can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can read their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can read all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON quiz_attempts;

DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can read quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Authenticated users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Authenticated users can read quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can update their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can delete their quizzes" ON quizzes;

-- 6. Create permissive policies for testing
CREATE POLICY "Allow all for quizzes" ON quizzes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for questions" ON questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for quiz_attempts" ON quiz_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Show the created quiz ID
SELECT 
    q.id as quiz_id,
    q.title,
    q.creator_id,
    COUNT(qu.id) as question_count
FROM quizzes q
LEFT JOIN questions qu ON q.id = qu.quiz_id
WHERE q.title = 'Test Quiz'
GROUP BY q.id, q.title, q.creator_id;
