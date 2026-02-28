-- Fix Gradebook RLS Policies
-- This script will create proper RLS policies for course_grade_items

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view gradebook items for courses they are enrolled in" ON course_grade_items;
DROP POLICY IF EXISTS "Instructors can manage gradebook items for their courses" ON course_grade_items;
DROP POLICY IF EXISTS "Admins can manage all gradebook items" ON course_grade_items;

-- 2. Create new policies
-- Policy for students to view gradebook items for courses they are enrolled in
CREATE POLICY "Students can view gradebook items for enrolled courses" ON course_grade_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = course_grade_items.course_id
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
    );

-- Policy for instructors to manage gradebook items for their courses
CREATE POLICY "Instructors can manage gradebook items for their courses" ON course_grade_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = course_grade_items.course_id
            AND ci.instructor_id = auth.uid()
        )
    );

-- Policy for admins to manage all gradebook items
CREATE POLICY "Admins can manage all gradebook items" ON course_grade_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 3. Verify policies were created
SELECT 
    'RLS Policies Created' as status,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'course_grade_items'
ORDER BY policyname;
