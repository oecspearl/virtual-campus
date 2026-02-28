-- Debug Assignments Table
-- This script checks if the assignments table exists and has the correct structure

-- 1. Check if assignments table exists
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_name = 'assignments';

-- 2. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'assignments';

-- 4. Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'assignments'
ORDER BY policyname;

-- 5. Check if there are any assignments in the table
SELECT COUNT(*) as assignment_count FROM assignments;

-- 6. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'assignments';

-- 7. Test basic query (this should work if RLS is properly configured)
SELECT id, title, created_at FROM assignments LIMIT 5;
