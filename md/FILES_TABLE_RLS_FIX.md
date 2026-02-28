# 🔧 Files Table RLS Fix - Complete Solution

## 🚨 Problem Identified

The media upload is failing because:
- ✅ **Storage upload succeeds** (200) - files upload to Supabase Storage
- ❌ **Database insert fails** (403) - RLS policies block insertion into `files` table
- ❌ **App returns 500** - the 403 error bubbles up as a server error

## ✅ Solution: Fix RLS Policies for Files Table

### Step 1: Run the RLS Fix SQL

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run the SQL from `fix-files-table-rls.sql`**:

```sql
-- Enable RLS on files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can view all files" ON files;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Create new RLS policies
CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view all files" ON files
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = uploaded_by);
```

### Step 2: Test the Fix

1. **Run the test script**:
```bash
node test-files-table-access.js
```

2. **Expected output**:
```
✅ SELECT successful - found X files
✅ INSERT successful - created file with ID: [uuid]
```

### Step 3: Test Media Upload

1. **Visit your app**: https://oecs-learnboard-lms-e03748e4aa2c.herokuapp.com/
2. **Go to lesson editing page**
3. **Try uploading a file**
4. **Check Heroku logs** - should see successful upload

## 🔍 What This Fixes

### Before Fix:
```
Storage Upload: ✅ 200 OK
Database Insert: ❌ 403 Forbidden (RLS policy blocks)
App Response: ❌ 500 Internal Server Error
```

### After Fix:
```
Storage Upload: ✅ 200 OK
Database Insert: ✅ 200 OK (RLS policy allows)
App Response: ✅ 200 OK with file data
```

## 📋 RLS Policies Created

1. **INSERT Policy**: Authenticated users can insert files where `uploaded_by` matches their user ID
2. **SELECT Policy**: Authenticated users can view all files
3. **UPDATE Policy**: Users can update their own files
4. **DELETE Policy**: Users can delete their own files

## 🧪 Verification Steps

1. **Check RLS is enabled**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'files';
```

2. **Check policies exist**:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'files';
```

3. **Test file upload in app** - should work without 500 errors

## 🎯 Expected Result

After applying this fix:
- ✅ Media uploads will work completely
- ✅ Files will be stored in Supabase Storage
- ✅ File metadata will be saved to database
- ✅ No more 500 errors from `/api/media/upload`
- ✅ Users can upload files for course materials

## 📁 Files Created

- `fix-files-table-rls.sql` - SQL to fix RLS policies
- `test-files-table-access.js` - Test script to verify fix
- `FILES_TABLE_RLS_FIX.md` - This guide

The media upload functionality should now work perfectly! 🎉
