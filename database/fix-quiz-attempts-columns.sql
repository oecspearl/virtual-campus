-- ==============================================
-- FIX QUIZ_ATTEMPTS TABLE - ADD MISSING COLUMNS
-- ==============================================

-- Check if quiz_attempts table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quiz_attempts') THEN
        CREATE TABLE quiz_attempts (
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
            time_taken INTEGER DEFAULT 0,
            status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(quiz_id, student_id, attempt_number)
        );
    END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add course_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'course_id') THEN
        ALTER TABLE quiz_attempts ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
    
    -- Add attempt_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'attempt_number') THEN
        ALTER TABLE quiz_attempts ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    -- Add started_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'started_at') THEN
        ALTER TABLE quiz_attempts ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    -- Add submitted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'submitted_at') THEN
        ALTER TABLE quiz_attempts ADD COLUMN submitted_at TIMESTAMPTZ;
    END IF;
    
    -- Add score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'score') THEN
        ALTER TABLE quiz_attempts ADD COLUMN score INTEGER DEFAULT 0;
    END IF;
    
    -- Add max_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'max_score') THEN
        ALTER TABLE quiz_attempts ADD COLUMN max_score INTEGER DEFAULT 0;
    END IF;
    
    -- Add percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'percentage') THEN
        ALTER TABLE quiz_attempts ADD COLUMN percentage DECIMAL(5,2);
    END IF;
    
    -- Add answers column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'answers') THEN
        ALTER TABLE quiz_attempts ADD COLUMN answers JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add time_taken column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'time_taken') THEN
        ALTER TABLE quiz_attempts ADD COLUMN time_taken INTEGER DEFAULT 0;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'status') THEN
        ALTER TABLE quiz_attempts ADD COLUMN status TEXT DEFAULT 'in_progress' 
        CHECK (status IN ('in_progress', 'submitted', 'graded'));
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'created_at') THEN
        ALTER TABLE quiz_attempts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quiz_attempts' AND column_name = 'updated_at') THEN
        ALTER TABLE quiz_attempts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

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
