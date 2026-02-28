-- Test script to verify assignment_submissions RLS policies work
-- This should be run after applying the RLS policy fixes

-- Test 1: Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'assignment_submissions'
ORDER BY policyname;

-- Test 2: Check if a student can insert a submission (this should work after the fix)
-- Note: This test requires an authenticated user context
-- You would run this in the Supabase SQL editor with a student user logged in

-- Test 3: Check assignment_submissions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'assignment_submissions'
ORDER BY ordinal_position;

-- Test 4: Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'assignment_submissions';
