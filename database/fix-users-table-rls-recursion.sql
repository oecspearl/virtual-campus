-- Fix infinite recursion in users table RLS policy
-- The recursion happens because policies on other tables check users.role,
-- and if users table RLS also checks users.role, it causes infinite recursion.

-- Disable RLS on users table (we'll handle access control via service client in API routes)
-- OR create a simple policy that doesn't reference the users table itself

-- Option 1: Disable RLS entirely (recommended for now)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, use a simple policy without recursion:
-- (uncomment this if you prefer to keep RLS enabled)

/*
-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;

-- Create simple, non-recursive policies
-- Allow users to read their own record
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow authenticated users to update their own record (name, email, etc. - not role)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Allow all authenticated users to read basic user info (for displaying names, etc.)
-- This is needed for displaying participant lists, instructor names, etc.
CREATE POLICY "Authenticated users can read basic user info" ON users
    FOR SELECT
    USING (auth.role() = 'authenticated');
*/

-- Verify RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

