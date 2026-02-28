-- Fix Storage Setup for Media Upload
-- This script sets up the course-materials storage bucket and policies

-- Note: Storage buckets and policies must be created through the Supabase Dashboard
-- This SQL is for reference only - run these commands in Supabase Dashboard

-- 1. Create the course-materials bucket (do this in Supabase Dashboard > Storage)
-- Bucket name: course-materials
-- Public: Yes (for direct file access)
-- File size limit: 50MB

-- 2. Create storage policies (do this in Supabase Dashboard > Storage > Policies)

-- Policy 1: Allow authenticated users to upload files
-- Policy name: Authenticated users can upload files
-- Policy type: INSERT
-- Policy definition:
-- bucket_id = 'course-materials' AND auth.role() = 'authenticated'

-- Policy 2: Allow authenticated users to view files  
-- Policy name: Authenticated users can view files
-- Policy type: SELECT
-- Policy definition:
-- bucket_id = 'course-materials' AND auth.role() = 'authenticated'

-- Policy 3: Allow users to update their own files
-- Policy name: Users can update their own files
-- Policy type: UPDATE
-- Policy definition:
-- bucket_id = 'course-materials' AND auth.role() = 'authenticated'

-- Policy 4: Allow users to delete their own files
-- Policy name: Users can delete their own files
-- Policy type: DELETE
-- Policy definition:
-- bucket_id = 'course-materials' AND auth.role() = 'authenticated'

-- Alternative: For development/testing, you can make the bucket public
-- Go to Storage > Settings > course-materials bucket > Toggle "Public bucket" to ON

-- Verify the files table exists and has proper RLS policies
SELECT * FROM information_schema.tables WHERE table_name = 'files';

-- Check if RLS is enabled on files table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'files';

-- If RLS is enabled, we need to create policies for the files table
-- Policy for files table: Allow authenticated users to insert their own files
CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Policy for files table: Allow authenticated users to view all files
CREATE POLICY "Users can view all files" ON files
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for files table: Allow users to update their own files
CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Policy for files table: Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = uploaded_by);
