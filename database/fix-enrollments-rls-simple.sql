-- Simple Fix for Enrollments RLS Policies
-- This script checks existing policies and only creates missing ones

-- First, enable RLS on enrollments table if not already enabled
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Check what policies already exist
SELECT 
    'Existing Policies' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    -- Policy 1: Users can read their own enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_select_own') THEN
        CREATE POLICY "enrollments_select_own" ON enrollments
            FOR SELECT USING (student_id = auth.uid());
    END IF;

    -- Policy 2: Instructors can read enrollments for courses they teach
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_select_instructor') THEN
        CREATE POLICY "enrollments_select_instructor" ON enrollments
            FOR SELECT USING (
                course_id IN (
                    SELECT ci.course_id 
                    FROM course_instructors ci 
                    WHERE ci.instructor_id = auth.uid()
                )
            );
    END IF;

    -- Policy 3: Admins can read all enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_select_admin') THEN
        CREATE POLICY "enrollments_select_admin" ON enrollments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin', 'curriculum_designer')
                )
            );
    END IF;

    -- Policy 4: Instructors can insert enrollments for courses they teach
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_insert_instructor') THEN
        CREATE POLICY "enrollments_insert_instructor" ON enrollments
            FOR INSERT WITH CHECK (
                course_id IN (
                    SELECT ci.course_id 
                    FROM course_instructors ci 
                    WHERE ci.instructor_id = auth.uid()
                )
            );
    END IF;

    -- Policy 5: Admins can insert enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_insert_admin') THEN
        CREATE POLICY "enrollments_insert_admin" ON enrollments
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin', 'curriculum_designer')
                )
            );
    END IF;

    -- Policy 6: Instructors can update enrollments for courses they teach
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_update_instructor') THEN
        CREATE POLICY "enrollments_update_instructor" ON enrollments
            FOR UPDATE USING (
                course_id IN (
                    SELECT ci.course_id 
                    FROM course_instructors ci 
                    WHERE ci.instructor_id = auth.uid()
                )
            );
    END IF;

    -- Policy 7: Admins can update enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_update_admin') THEN
        CREATE POLICY "enrollments_update_admin" ON enrollments
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin', 'curriculum_designer')
                )
            );
    END IF;

    -- Policy 8: Instructors can delete enrollments for courses they teach
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_delete_instructor') THEN
        CREATE POLICY "enrollments_delete_instructor" ON enrollments
            FOR DELETE USING (
                course_id IN (
                    SELECT ci.course_id 
                    FROM course_instructors ci 
                    WHERE ci.instructor_id = auth.uid()
                )
            );
    END IF;

    -- Policy 9: Admins can delete enrollments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'enrollments_delete_admin') THEN
        CREATE POLICY "enrollments_delete_admin" ON enrollments
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin', 'curriculum_designer')
                )
            );
    END IF;

END $$;

-- Verify RLS is enabled and policies are created
SELECT 
    'RLS Status Check' as info,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'enrollments';

-- Check created policies
SELECT 
    'Enrollments Policies' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- Test if we can query enrollments (this should work for admins)
SELECT 
    'Test Query' as info,
    COUNT(*) as total_enrollments
FROM enrollments;
