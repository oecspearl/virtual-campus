-- ==============================================
-- FIX QUIZZES TABLE - COURSE-BASED SYSTEM
-- ==============================================

-- Add course_id column to quizzes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quizzes' AND column_name = 'course_id') THEN
        ALTER TABLE quizzes ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add attempt_number column to quiz_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'attempt_number') THEN
        ALTER TABLE quiz_attempts ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Add course_id column to quiz_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'course_id') THEN
        ALTER TABLE quiz_attempts ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing quizzes to have course_id based on their lesson's course_id
UPDATE quizzes 
SET course_id = lessons.course_id
FROM lessons 
WHERE quizzes.lesson_id = lessons.id 
AND quizzes.course_id IS NULL;

-- For quizzes without lessons, we'll need to handle them manually
-- This is a placeholder - you may need to manually assign course_id for standalone quizzes
-- UPDATE quizzes SET course_id = 'your-course-id' WHERE course_id IS NULL AND lesson_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_id ON quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempt_number ON quiz_attempts(attempt_number);

-- ==============================================
-- UPDATE RLS POLICIES FOR QUIZZES
-- ==============================================

-- Enable RLS on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view published quizzes" ON quizzes;
DROP POLICY IF EXISTS "Instructors can view all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Instructors can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Instructors can update their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Instructors can delete their quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can view all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can update all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Admins can delete all quizzes" ON quizzes;

-- Policy: Allow users to view published quizzes for courses they're enrolled in
CREATE POLICY "Users can view published quizzes for enrolled courses" ON quizzes
    FOR SELECT
    TO authenticated
    USING (
        published = true 
        AND (
            course_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM enrollments 
                WHERE enrollments.student_id = auth.uid() 
                AND enrollments.course_id = quizzes.course_id
                AND enrollments.status = 'active'
            )
        )
    );

-- Policy: Allow instructors to view all quizzes for their courses
CREATE POLICY "Instructors can view quizzes for their courses" ON quizzes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            course_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM course_instructors 
                WHERE course_instructors.course_id = quizzes.course_id 
                AND course_instructors.instructor_id = auth.uid()
            )
        )
    );

-- Policy: Allow admins to view all quizzes
CREATE POLICY "Admins can view all quizzes" ON quizzes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to create quizzes for their courses
CREATE POLICY "Instructors can create quizzes for their courses" ON quizzes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            course_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM course_instructors 
                WHERE course_instructors.course_id = quizzes.course_id 
                AND course_instructors.instructor_id = auth.uid()
            )
        )
        AND creator_id = auth.uid()
    );

-- Policy: Allow admins to create quizzes
CREATE POLICY "Admins can create quizzes" ON quizzes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to update their quizzes
CREATE POLICY "Instructors can update their quizzes" ON quizzes
    FOR UPDATE
    TO authenticated
    USING (
        creator_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy: Allow admins to update all quizzes
CREATE POLICY "Admins can update all quizzes" ON quizzes
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to delete their quizzes
CREATE POLICY "Instructors can delete their quizzes" ON quizzes
    FOR DELETE
    TO authenticated
    USING (
        creator_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy: Allow admins to delete all quizzes
CREATE POLICY "Admins can delete all quizzes" ON quizzes
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- ==============================================
-- UPDATE RLS POLICIES FOR QUIZ_ATTEMPTS
-- ==============================================

-- Enable RLS on quiz_attempts table
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Instructors can view all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can create quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can update all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can delete all quiz attempts" ON quiz_attempts;

-- Policy: Allow users to view their own quiz attempts
CREATE POLICY "Users can view their own quiz attempts" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- Policy: Allow instructors to view quiz attempts for their courses
CREATE POLICY "Instructors can view quiz attempts for their courses" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            course_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM course_instructors 
                WHERE course_instructors.course_id = quiz_attempts.course_id 
                AND course_instructors.instructor_id = auth.uid()
            )
        )
    );

-- Policy: Allow admins to view all quiz attempts
CREATE POLICY "Admins can view all quiz attempts" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow users to create quiz attempts for courses they're enrolled in
CREATE POLICY "Users can create quiz attempts for enrolled courses" ON quiz_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid() 
        AND (
            course_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM enrollments 
                WHERE enrollments.student_id = auth.uid() 
                AND enrollments.course_id = quiz_attempts.course_id
                AND enrollments.status = 'active'
            )
        )
    );

-- Policy: Allow admins to create quiz attempts
CREATE POLICY "Admins can create quiz attempts" ON quiz_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow users to update their own quiz attempts
CREATE POLICY "Users can update their own quiz attempts" ON quiz_attempts
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

-- Policy: Allow admins to update all quiz attempts
CREATE POLICY "Admins can update all quiz attempts" ON quiz_attempts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to delete all quiz attempts
CREATE POLICY "Admins can delete all quiz attempts" ON quiz_attempts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check quizzes table columns
SELECT 'quizzes columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quiz_attempts table columns
SELECT 'quiz_attempts columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quizzes RLS policies
SELECT 'quizzes policies:' as info, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'quizzes'
ORDER BY policyname;

-- Check quiz_attempts RLS policies
SELECT 'quiz_attempts policies:' as info, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;

-- Check RLS status
SELECT 'RLS Status:' as info, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('quizzes', 'quiz_attempts')
ORDER BY tablename;
