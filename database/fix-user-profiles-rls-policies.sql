-- Fix RLS policies for user_profiles table
-- This allows users to manage their own profiles while maintaining security

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Enable RLS (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can delete their own profile (optional, for cleanup)
CREATE POLICY "Users can delete own profile"
ON user_profiles
FOR DELETE
USING (user_id = auth.uid());

-- Policy 5: Service role can manage all profiles (for API routes using service client)
-- This allows the service role to bypass RLS when needed
CREATE POLICY "Service role can manage all profiles"
ON user_profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Verify policies were created
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
WHERE tablename = 'user_profiles'
ORDER BY policyname;
