-- Fix RLS policies for courses table to give admins full CRUD access
-- Run this in Supabase SQL Editor

-- First, let's check current policies and drop them if they exist
DROP POLICY IF EXISTS "Users can view published courses" ON courses;
DROP POLICY IF EXISTS "Instructors can create courses" ON courses;
DROP POLICY IF EXISTS "Instructors can update their courses" ON courses;
DROP POLICY IF EXISTS "Instructors can delete their courses" ON courses;

-- Enable RLS on courses table (if not already enabled)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow everyone to view published courses
CREATE POLICY "Everyone can view published courses" ON courses
    FOR SELECT
    TO authenticated
    USING (published = true);

-- Policy 2: Allow admins to view ALL courses (published and unpublished)
CREATE POLICY "Admins can view all courses" ON courses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 3: Allow admins to create courses
CREATE POLICY "Admins can create courses" ON courses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 4: Allow instructors to create courses (for backward compatibility)
CREATE POLICY "Instructors can create courses" ON courses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy 5: Allow admins to update ALL courses
CREATE POLICY "Admins can update all courses" ON courses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 6: Allow instructors to update courses they're assigned to (for backward compatibility)
CREATE POLICY "Course instructors can update their courses" ON courses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = courses.id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

-- Policy 7: Allow admins to delete ALL courses
CREATE POLICY "Admins can delete all courses" ON courses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 8: Allow instructors to delete courses they're assigned to (for backward compatibility)
CREATE POLICY "Course instructors can delete their courses" ON courses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = courses.id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'courses'
ORDER BY policyname;
