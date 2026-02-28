-- Fix RLS policies for files table
-- This will allow authenticated users to insert, view, update, and delete files

-- First, check if RLS is enabled on the files table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'files';

-- Enable RLS on files table if not already enabled
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can view all files" ON files;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Create new RLS policies for the files table

-- Policy 1: Allow authenticated users to insert files
CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Policy 2: Allow authenticated users to view all files
CREATE POLICY "Users can view all files" ON files
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 3: Allow users to update their own files
CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'files';

-- Test query to verify the policies work
-- This should return the count of files (should work for authenticated users)
SELECT COUNT(*) as file_count FROM files;
