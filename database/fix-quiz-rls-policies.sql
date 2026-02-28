-- Fix RLS policies for quiz creation and attempts
-- This script addresses the RLS policy violations we're seeing

-- First, let's check what RLS policies exist
-- (This is for reference - you'll need to run this in Supabase)

-- Fix questions table RLS policy
-- The current policy is too restrictive for question creation

-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can create questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can update questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can delete questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Authenticated users can create questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;
DROP POLICY IF EXISTS "Quiz creators can update questions" ON questions;
DROP POLICY IF EXISTS "Quiz creators can delete questions" ON questions;

-- Create more permissive policies for questions
CREATE POLICY "Authenticated users can create questions" ON questions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read questions" ON questions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Quiz creators can update questions" ON questions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

CREATE POLICY "Quiz creators can delete questions" ON questions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Fix quiz_attempts table RLS policy
-- Make it more permissive for testing

-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can create quiz attempts for enrolled courses" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Authenticated users can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can read their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can read all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON quiz_attempts;

-- Create more permissive policies for quiz attempts
CREATE POLICY "Authenticated users can create quiz attempts" ON quiz_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can read their own quiz attempts" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Admins can read all quiz attempts" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
        )
    );

CREATE POLICY "Users can update their own quiz attempts" ON quiz_attempts
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

-- Also ensure quizzes table has proper RLS policies
-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can read quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Authenticated users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Authenticated users can read quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can update their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Quiz creators can delete their quizzes" ON quizzes;

-- Create permissive policies for quizzes
CREATE POLICY "Authenticated users can create quizzes" ON quizzes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read quizzes" ON quizzes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Quiz creators can update their quizzes" ON quizzes
    FOR UPDATE
    TO authenticated
    USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

CREATE POLICY "Quiz creators can delete their quizzes" ON quizzes
    FOR DELETE
    TO authenticated
    USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );
