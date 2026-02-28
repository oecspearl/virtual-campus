-- Fix RLS policies for course_instructors table
-- Run this in Supabase SQL Editor

-- Enable RLS on course_instructors table
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to view all course instructors
CREATE POLICY "Admins can view all course instructors" ON course_instructors
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow course instructors to view their own assignments
CREATE POLICY "Course instructors can view their own assignments" ON course_instructors
    FOR SELECT
    TO authenticated
    USING (instructor_id = auth.uid());

-- Policy: Allow admins to insert course instructors
CREATE POLICY "Admins can add course instructors" ON course_instructors
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to update course instructors
CREATE POLICY "Admins can update course instructors" ON course_instructors
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to delete course instructors
CREATE POLICY "Admins can delete course instructors" ON course_instructors
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'course_instructors';
