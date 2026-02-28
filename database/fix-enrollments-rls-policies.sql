-- Fix RLS Policies for Enrollments Table
-- This addresses the participant loading errors caused by missing RLS policies

-- First, enable RLS on enrollments table if not already enabled
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "enrollments_select_own" ON enrollments;
DROP POLICY IF EXISTS "enrollments_select_instructor" ON enrollments;
DROP POLICY IF EXISTS "enrollments_select_admin" ON enrollments;
DROP POLICY IF EXISTS "enrollments_insert_instructor" ON enrollments;
DROP POLICY IF EXISTS "enrollments_insert_admin" ON enrollments;
DROP POLICY IF EXISTS "enrollments_update_instructor" ON enrollments;
DROP POLICY IF EXISTS "enrollments_update_admin" ON enrollments;
DROP POLICY IF EXISTS "enrollments_delete_instructor" ON enrollments;
DROP POLICY IF EXISTS "enrollments_delete_admin" ON enrollments;
DROP POLICY IF EXISTS "enrollments_select_policy" ON enrollments;
DROP POLICY IF EXISTS "enrollments_insert_policy" ON enrollments;
DROP POLICY IF EXISTS "enrollments_update_policy" ON enrollments;
DROP POLICY IF EXISTS "enrollments_delete_policy" ON enrollments;

-- Policy 1: Users can read their own enrollments
CREATE POLICY "enrollments_select_own" ON enrollments
    FOR SELECT USING (student_id = auth.uid());

-- Policy 2: Instructors can read enrollments for courses they teach
CREATE POLICY "enrollments_select_instructor" ON enrollments
    FOR SELECT USING (
        course_id IN (
            SELECT ci.course_id 
            FROM course_instructors ci 
            WHERE ci.instructor_id = auth.uid()
        )
    );

-- Policy 3: Admins can read all enrollments
CREATE POLICY "enrollments_select_admin" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 4: Instructors can insert enrollments for courses they teach
CREATE POLICY "enrollments_insert_instructor" ON enrollments
    FOR INSERT WITH CHECK (
        course_id IN (
            SELECT ci.course_id 
            FROM course_instructors ci 
            WHERE ci.instructor_id = auth.uid()
        )
    );

-- Policy 5: Admins can insert enrollments
CREATE POLICY "enrollments_insert_admin" ON enrollments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 6: Instructors can update enrollments for courses they teach
CREATE POLICY "enrollments_update_instructor" ON enrollments
    FOR UPDATE USING (
        course_id IN (
            SELECT ci.course_id 
            FROM course_instructors ci 
            WHERE ci.instructor_id = auth.uid()
        )
    );

-- Policy 7: Admins can update enrollments
CREATE POLICY "enrollments_update_admin" ON enrollments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 8: Instructors can delete enrollments for courses they teach
CREATE POLICY "enrollments_delete_instructor" ON enrollments
    FOR DELETE USING (
        course_id IN (
            SELECT ci.course_id 
            FROM course_instructors ci 
            WHERE ci.instructor_id = auth.uid()
        )
    );

-- Policy 9: Admins can delete enrollments
CREATE POLICY "enrollments_delete_admin" ON enrollments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

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
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'enrollments'
ORDER BY policyname;
