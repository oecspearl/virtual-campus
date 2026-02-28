-- Fix Infinite Recursion in Enrollments RLS Policies
-- This script fixes the infinite recursion error by restructuring RLS policies
-- to avoid circular dependencies between enrollments and other tables

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view accessible scorm packages" ON scorm_packages;
DROP POLICY IF EXISTS "enrollments_select_own" ON enrollments;
DROP POLICY IF EXISTS "enrollments_select_instructor" ON enrollments;
DROP POLICY IF EXISTS "enrollments_select_admin" ON enrollments;

-- Step 2: Create a SECURITY DEFINER function to check enrollments without RLS
-- This function bypasses RLS and can be used in other RLS policies
CREATE OR REPLACE FUNCTION check_user_enrollment(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = p_user_id
        AND course_id = p_course_id
        AND status = 'active'
    );
END;
$$;

-- Step 3: Recreate enrollments policies using simpler checks
-- Policy 1: Users can read their own enrollments
CREATE POLICY "enrollments_select_own" ON enrollments
    FOR SELECT USING (student_id = auth.uid());

-- Policy 2: Instructors can read enrollments for courses they teach
-- Use a function to avoid recursion
CREATE OR REPLACE FUNCTION check_is_instructor(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM course_instructors
        WHERE instructor_id = p_user_id
        AND course_id = p_course_id
    );
END;
$$;

CREATE POLICY "enrollments_select_instructor" ON enrollments
    FOR SELECT USING (
        check_is_instructor(auth.uid(), course_id)
    );

-- Policy 3: Admins can read all enrollments
-- Use a function to check user role without recursion
CREATE OR REPLACE FUNCTION check_is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id
        AND role IN ('admin', 'super_admin', 'curriculum_designer')
    );
END;
$$;

CREATE POLICY "enrollments_select_admin" ON enrollments
    FOR SELECT USING (check_is_admin(auth.uid()));

-- Step 4: Recreate SCORM package policy using the enrollment check function
CREATE POLICY "Users can view accessible scorm packages" ON scorm_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.id = scorm_packages.lesson_id
            AND l.published = true
            AND (
                -- Student enrolled in course (using function to avoid recursion)
                check_user_enrollment(auth.uid(), scorm_packages.course_id)
                OR
                -- Instructor/Admin access (using function to avoid recursion)
                check_is_admin(auth.uid())
                OR
                EXISTS (
                    SELECT 1 FROM course_instructors ci
                    WHERE ci.course_id = scorm_packages.course_id
                    AND ci.instructor_id = auth.uid()
                )
                OR
                -- Creator of the package
                created_by = auth.uid()
            )
        )
    );

-- Step 5: Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION check_user_enrollment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_instructor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin(UUID) TO authenticated;

-- Step 6: Verify the fix
SELECT 
    'RLS Policies Fixed' as status,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('enrollments', 'scorm_packages')
ORDER BY tablename, policyname;

-- Test query (should not cause recursion)
-- SELECT * FROM enrollments WHERE student_id = auth.uid() LIMIT 1;

