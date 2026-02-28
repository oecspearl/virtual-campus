-- ==============================================
-- CREATE QUIZ_ATTEMPTS TABLE
-- ==============================================

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage DECIMAL(5,2),
    answers JSONB DEFAULT '[]'::jsonb,
    time_taken INTEGER DEFAULT 0, -- in seconds
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique attempt number per student per quiz
    UNIQUE(quiz_id, student_id, attempt_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_id ON quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

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

-- Policy: Allow instructors to view all quiz attempts
CREATE POLICY "Instructors can view all quiz attempts" ON quiz_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
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
CREATE POLICY "Users can create quiz attempts" ON quiz_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.student_id = auth.uid() 
            AND enrollments.course_id = quiz_attempts.course_id
            AND enrollments.status = 'active'
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

-- Check if quiz_attempts table exists and has RLS enabled
SELECT 'quiz_attempts table info:' as info, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quiz_attempts';

-- Check quiz_attempts table columns
SELECT 'quiz_attempts columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quiz_attempts RLS policies
SELECT 'quiz_attempts policies:' as info, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'quiz_attempts'
ORDER BY policyname;
