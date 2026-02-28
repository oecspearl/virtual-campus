-- Fix RLS Policies for Assignments Table
-- This addresses the 500 error when accessing assignments API

-- Enable RLS on assignments table if not already enabled
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "assignments_select_published" ON assignments;
DROP POLICY IF EXISTS "assignments_select_creator" ON assignments;
DROP POLICY IF EXISTS "assignments_select_instructor" ON assignments;
DROP POLICY IF EXISTS "assignments_select_admin" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_creator" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_instructor" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_admin" ON assignments;
DROP POLICY IF EXISTS "assignments_update_creator" ON assignments;
DROP POLICY IF EXISTS "assignments_update_instructor" ON assignments;
DROP POLICY IF EXISTS "assignments_update_admin" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_creator" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_instructor" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_admin" ON assignments;

-- Policy 1: Anyone can read published assignments
CREATE POLICY "assignments_select_published" ON assignments
    FOR SELECT USING (published = true);

-- Policy 2: Creators can read their own assignments
CREATE POLICY "assignments_select_creator" ON assignments
    FOR SELECT USING (creator_id = auth.uid());

-- Policy 3: Instructors can read assignments for courses they teach
CREATE POLICY "assignments_select_instructor" ON assignments
    FOR SELECT USING (
        lesson_id IN (
            SELECT l.id 
            FROM lessons l
            JOIN subjects s ON l.subject_id = s.id
            JOIN course_instructors ci ON s.course_id = ci.course_id
            WHERE ci.instructor_id = auth.uid()
        )
        OR
        class_id IN (
            SELECT c.id 
            FROM classes c
            JOIN course_instructors ci ON c.course_id = ci.course_id
            WHERE ci.instructor_id = auth.uid()
        )
    );

-- Policy 4: Admins can read all assignments
CREATE POLICY "assignments_select_admin" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 5: Creators can insert their own assignments
CREATE POLICY "assignments_insert_creator" ON assignments
    FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Policy 6: Instructors can insert assignments for courses they teach
CREATE POLICY "assignments_insert_instructor" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            lesson_id IN (
                SELECT l.id 
                FROM lessons l
                JOIN subjects s ON l.subject_id = s.id
                JOIN course_instructors ci ON s.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
            OR
            class_id IN (
                SELECT c.id 
                FROM classes c
                JOIN course_instructors ci ON c.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
        )
    );

-- Policy 7: Admins can insert assignments
CREATE POLICY "assignments_insert_admin" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 8: Creators can update their own assignments
CREATE POLICY "assignments_update_creator" ON assignments
    FOR UPDATE USING (creator_id = auth.uid());

-- Policy 9: Instructors can update assignments for courses they teach
CREATE POLICY "assignments_update_instructor" ON assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            lesson_id IN (
                SELECT l.id 
                FROM lessons l
                JOIN subjects s ON l.subject_id = s.id
                JOIN course_instructors ci ON s.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
            OR
            class_id IN (
                SELECT c.id 
                FROM classes c
                JOIN course_instructors ci ON c.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
        )
    );

-- Policy 10: Admins can update all assignments
CREATE POLICY "assignments_update_admin" ON assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy 11: Creators can delete their own assignments
CREATE POLICY "assignments_delete_creator" ON assignments
    FOR DELETE USING (creator_id = auth.uid());

-- Policy 12: Instructors can delete assignments for courses they teach
CREATE POLICY "assignments_delete_instructor" ON assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        AND (
            lesson_id IN (
                SELECT l.id 
                FROM lessons l
                JOIN subjects s ON l.subject_id = s.id
                JOIN course_instructors ci ON s.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
            OR
            class_id IN (
                SELECT c.id 
                FROM classes c
                JOIN course_instructors ci ON c.course_id = ci.course_id
                WHERE ci.instructor_id = auth.uid()
            )
        )
    );

-- Policy 13: Admins can delete all assignments
CREATE POLICY "assignments_delete_admin" ON assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'assignments' 
ORDER BY policyname;
