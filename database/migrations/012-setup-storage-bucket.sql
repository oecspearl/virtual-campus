-- Migration: 012-setup-storage-bucket.sql
-- Description: Setup course-materials storage bucket and policies
-- Note: The bucket must be created manually in Supabase Dashboard first

-- Create storage policies for course-materials bucket
-- These policies control who can upload, view, and delete files

-- Policy: Allow authenticated users to upload files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Allow authenticated uploads',
  'course-materials',
  'INSERT',
  '((auth.role() = ''authenticated''::text))'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'course-materials' AND name = 'Allow authenticated uploads'
);

-- Policy: Allow public read access to files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Allow public read access',
  'course-materials',
  'SELECT',
  'true'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'course-materials' AND name = 'Allow public read access'
);

-- Policy: Allow file owners to delete their files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Allow owner deletes',
  'course-materials',
  'DELETE',
  '((auth.uid() = owner))'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'course-materials' AND name = 'Allow owner deletes'
);

-- Alternative: If the above doesn't work, you can manually create policies in the Supabase Dashboard:
-- 1. Go to Storage > course-materials > Policies
-- 2. Create a new policy for INSERT with: (auth.role() = 'authenticated')
-- 3. Create a new policy for SELECT with: true (allow public access)
-- 4. Create a new policy for DELETE with: (auth.uid() = owner)

-- IMPORTANT: Make sure the bucket 'course-materials' is set to PUBLIC in the dashboard
-- This allows the getPublicUrl() function to return accessible URLs
