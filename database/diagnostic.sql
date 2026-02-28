-- ============================================================================
-- Database Diagnostic Script
-- ============================================================================
-- Run this to diagnose what's happening with your database
-- ============================================================================

-- Check 1: Does the auth schema exist?
SELECT 
  'auth schema exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.schemata 
    WHERE schema_name = 'auth'
  ) as result;

-- Check 2: Does auth.users table exist?
SELECT 
  'auth.users table exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    AND table_name = 'users'
  ) as result;

-- Check 3: How many users in auth.users?
SELECT 
  'Total users in auth.users' as check_name,
  COUNT(*) as result
FROM auth.users;

-- Check 4: List all auth users
SELECT 
  'All auth users' as info,
  id, 
  email, 
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Check 5: Does public.users table exist?
SELECT 
  'public.users table exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) as result;

-- Check 6: How many users in public.users?
SELECT 
  'Total users in public.users' as check_name,
  COUNT(*) as result
FROM public.users;

-- Check 7: List all public users
SELECT 
  'All public users' as info,
  id, 
  email, 
  name,
  role,
  created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 10;

-- Check 8: List all schemas in database
SELECT 
  'Available schemas' as info,
  schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;

-- Check 9: List all tables in public schema
SELECT 
  'Tables in public schema' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check 10: Check database connection info
SELECT 
  'Current database' as info,
  current_database() as database_name,
  current_user as connected_as,
  inet_server_addr() as server_address;

-- ============================================================================
-- If auth.users is empty, here's how to create a user via SQL
-- (This uses Supabase's internal functions)
-- ============================================================================

-- UNCOMMENT AND RUN THIS ONLY IF auth.users exists but is empty:
/*
-- This creates a user using Supabase's auth functions
-- Note: This might not work depending on your RLS policies

SELECT auth.uid(); -- Check if you're authenticated

-- Try to create a user (this may fail due to permissions)
-- If it fails, you MUST use the Supabase Dashboard UI
*/

-- ============================================================================
-- END OF DIAGNOSTIC SCRIPT
-- ============================================================================
