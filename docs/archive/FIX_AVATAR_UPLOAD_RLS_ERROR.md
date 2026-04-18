# Fix Avatar Upload RLS Error

## Error Message
```
File upload failed: new row violates row-level security policy
```

## Quick Fix (2 Steps)

### Step 1: Run SQL in Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste This SQL**:

```sql
-- Fix RLS policies for user_profiles table
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

-- Policy 4: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON user_profiles
FOR DELETE
USING (user_id = auth.uid());

-- Policy 5: Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles"
ON user_profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

4. **Click "Run"** (or press Ctrl+Enter)

5. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - No errors should appear

### Step 2: Verify Environment Variable (Production Only)

If you're on production (oecsmypd.org), ensure the environment variable is set:

1. **Check Vercel/Your Hosting Platform**
   - Go to your project settings
   - Find "Environment Variables"
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Value should be your Supabase service role key (found in Supabase Dashboard → Settings → API)

2. **If Missing, Add It**:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your service role key (starts with `eyJ...`)
   - Scope: Production, Preview, Development (all)

3. **Redeploy** (if you added/updated the variable)

## What These Policies Do

- **Users can view own profile**: Users can read their own profile data
- **Users can insert own profile**: Users can create their profile record
- **Users can update own profile**: Users can update their own profile (including avatar)
- **Users can delete own profile**: Users can delete their profile
- **Service role can manage all profiles**: API routes using service client can manage any profile

## Testing

After running the SQL:

1. **Try uploading an avatar again**
2. **Check browser console** - should see success message
3. **Check server logs** - should see successful profile update

## If Still Not Working

### Check 1: Verify Policies Were Created

Run this in Supabase SQL Editor:

```sql
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
```

You should see 5 policies listed.

### Check 2: Test Direct Database Access

Run this in Supabase SQL Editor (replace `YOUR_USER_ID` with an actual user ID):

```sql
-- This should work if policies are correct
SELECT * FROM user_profiles WHERE user_id = 'YOUR_USER_ID';
```

### Check 3: Check Service Role Key

In your production environment, verify the service role key is set:

```bash
# If you have access to the server
echo $SUPABASE_SERVICE_ROLE_KEY
```

If empty, add it to your environment variables.

## Alternative: Disable RLS (Not Recommended)

**Only use this if you absolutely cannot get RLS policies to work:**

```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: This removes all security. Only use for testing or if you have other security measures in place.

## Need Help?

If the error persists after running the SQL:

1. Check server logs for detailed error messages
2. Verify the SQL ran successfully (no errors)
3. Check that your user is authenticated (check browser console)
4. Verify the `user_profiles` table exists and has the correct structure
