-- ============================================================================
-- Part 18: Fix infinite recursion in users table RLS policies
-- ============================================================================
-- The "Admin can manage users" policy on the users table contains:
--   EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN (...))
-- This causes infinite recursion because querying `users` triggers the same
-- RLS policies, which query `users` again, etc.
--
-- Fix: Create a SECURITY DEFINER function that reads the user's role
-- bypassing RLS, then use that function in the policy.
-- ============================================================================

-- Step 1: Create a helper function that bypasses RLS to get the current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

-- Step 2: Replace the recursive policy on users
DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    current_user_role() IN ('super_admin', 'tenant_admin', 'admin')
  );

-- Step 3: Also fix the same pattern on other tables that reference users
-- from within their own policies (these don't cause recursion themselves
-- but using the function is cleaner and avoids a subquery per row).
--
-- Note: The 170+ policies on OTHER tables that do
--   EXISTS (SELECT 1 FROM users WHERE ...)
-- do NOT cause recursion because they're on different tables.
-- Only the policy ON the users table itself recurses.
-- So only the users table policy needs this fix.
