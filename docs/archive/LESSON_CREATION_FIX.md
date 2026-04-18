# 🔧 Lesson Creation Fix - RLS Policy Issue

## 🚨 **Problem Identified**

The lesson creation is failing with this error:
```
code: '42501',
message: 'new row violates row-level security policy for table "lessons"'
```

This is a **Row Level Security (RLS) policy violation** - the `lessons` table has RLS enabled but no policy allows the current user to insert lessons.

## 🛠️ **Solution Steps**

### **Step 1: Fix RLS Policies** ✅
Run this SQL in your Supabase SQL Editor:

```sql
-- Fix RLS policies for lessons table
-- This allows instructors, curriculum_designers, admins, and super_admins to manage lessons

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

-- Create policy for users to view their own lessons (if they created them)
CREATE POLICY "Users can view their own lessons" ON lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.id = lessons.created_by
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons TO authenticated;
GRANT USAGE ON SEQUENCE lessons_id_seq TO authenticated;
```

### **Step 2: Check Database Schema** ✅
Run this SQL to check if the `course_id` column exists:

```sql
-- Check if course_id column exists in lessons table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### **Step 3: Run Migration (if needed)** ✅
If the `course_id` column doesn't exist, run the migration:

```sql
-- Add course_id column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE lessons ALTER COLUMN subject_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
```

## 🎯 **Expected Results**

After running the RLS policy fix:

1. **Lesson Creation Should Work** - Instructors can create lessons
2. **Clear Error Messages** - Better error handling in the UI
3. **Direct Course-Lesson Relationship** - No subject dependency

## 🧪 **Test the Fix**

1. **Sign in** as an instructor/admin user
2. **Go to** `/lessons/create`
3. **Select a course** and fill in lesson details
4. **Click Create Lesson** - should work without errors
5. **Check** that lesson appears in course detail page

## 🔍 **Troubleshooting**

If you still get errors:

1. **Check User Role** - Ensure you're signed in with instructor/admin role
2. **Check Database** - Verify the RLS policies were created
3. **Check Console** - Look for specific error messages
4. **Check Network** - Verify API calls are successful

## 📋 **Files Updated**

- ✅ **API Route** - `app/api/lessons/route.ts` - Direct course_id approach
- ✅ **Error Handling** - Better error messages and parsing
- ✅ **RLS Policies** - `fix-lessons-rls.sql` - Proper permissions

**The main issue is the RLS policy - once that's fixed, lesson creation should work perfectly!** 🎉


























