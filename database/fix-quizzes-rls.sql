-- ==============================================
-- QUIZ CREATION FIX - RLS POLICIES
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

-- ==============================================
-- 1. SELECT POLICIES
-- ==============================================

-- Policy: Allow users to view published quizzes
CREATE POLICY "Users can view published quizzes" ON quizzes
    FOR SELECT
    TO authenticated
    USING (published = true);

-- Policy: Allow instructors to view all quizzes
CREATE POLICY "Instructors can view all quizzes" ON quizzes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
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

-- ==============================================
-- 2. INSERT POLICIES
-- ==============================================

-- Policy: Allow instructors to create quizzes
CREATE POLICY "Instructors can create quizzes" ON quizzes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
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

-- ==============================================
-- 3. UPDATE POLICIES
-- ==============================================

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

-- ==============================================
-- 4. DELETE POLICIES
-- ==============================================

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
-- 5. VERIFICATION QUERIES
-- ==============================================

-- Check if quizzes table exists and has RLS enabled
SELECT 'quizzes table info:' as info, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'quizzes';

-- Check quizzes table columns
SELECT 'quizzes columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quizzes RLS policies
SELECT 'quizzes policies:' as info, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'quizzes'
ORDER BY policyname;
