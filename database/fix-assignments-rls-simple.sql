-- Simple RLS Policy Fix for Assignments Table
-- This provides basic access to fix the 500 error

-- Enable RLS on assignments table if not already enabled
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "assignments_select_all" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_all" ON assignments;
DROP POLICY IF EXISTS "assignments_update_all" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_all" ON assignments;

-- Policy 1: Allow all authenticated users to read assignments
CREATE POLICY "assignments_select_all" ON assignments
    FOR SELECT TO authenticated USING (true);

-- Policy 2: Allow instructors, curriculum designers, and admins to insert assignments
CREATE POLICY "assignments_insert_all" ON assignments
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy 3: Allow instructors, curriculum designers, and admins to update assignments
CREATE POLICY "assignments_update_all" ON assignments
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy 4: Allow instructors, curriculum designers, and admins to delete assignments
CREATE POLICY "assignments_delete_all" ON assignments
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'assignments' 
ORDER BY policyname;
