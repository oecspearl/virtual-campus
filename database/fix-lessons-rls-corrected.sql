-- Fix RLS policies for lessons table
-- Copy and paste this entire block into Supabase SQL Editor

-- Enable RLS on lessons table (if not already enabled)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view published lessons" ON lessons;
DROP POLICY IF EXISTS "Instructors can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Users can view their own lessons" ON lessons;

-- Create policy for viewing lessons
CREATE POLICY "Users can view published lessons" ON lessons
  FOR SELECT
  USING (published = true);

-- Create policy for instructors to manage lessons
CREATE POLICY "Instructors can manage lessons" ON lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons TO authenticated;
GRANT USAGE ON SEQUENCE lessons_id_seq TO authenticated;


























