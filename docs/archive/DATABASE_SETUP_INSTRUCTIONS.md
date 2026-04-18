# 🗄️ Database Setup Instructions

## The Problem
You're getting 500 errors when trying to create courses because the database tables don't exist yet or RLS policies are blocking access.

## 🚀 Quick Setup

### Step 1: Create Database Tables
1. **Go to** your Supabase project dashboard
2. **Navigate** to SQL Editor
3. **Copy and paste** the contents of `supabase-schema.sql`
4. **Click** "Run" to create all tables

### Step 2: Set Up RLS Policies
After creating the tables, run these SQL commands to allow course creation:

```sql
-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow users with specific roles to insert courses
CREATE POLICY "Users can create courses" ON courses FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
));

-- Allow all authenticated users to read published courses
CREATE POLICY "Published courses are readable by all authenticated users" ON courses FOR SELECT 
USING (published = true);

-- Allow instructors, curriculum designers, admins, and super_admins to read their own courses (even if not published)
CREATE POLICY "Authorized users can read their own courses" ON courses FOR SELECT 
USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
));

-- Allow instructors, curriculum designers, admins, and super_admins to update their own courses
CREATE POLICY "Authorized users can update their own courses" ON courses FOR UPDATE 
USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
));

-- Allow instructors, curriculum designers, admins, and super_admins to delete their own courses
CREATE POLICY "Authorized users can delete their own courses" ON courses FOR DELETE 
USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
));
```

### Step 3: Create a Test User
Create a test user with instructor role:

```sql
-- Insert a test user (replace with your actual user ID from Supabase Auth)
INSERT INTO users (id, email, name, role) 
VALUES (
    'your-user-id-here', 
    'your-email@example.com', 
    'Test Instructor', 
    'instructor'
);
```

## 🔍 Alternative: Disable RLS for Development

If you want to quickly test without setting up RLS policies:

```sql
-- WARNING: This disables security - use only for development
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
```

## 🧪 Test Course Creation

After setting up the database:

1. **Sign in** to your application
2. **Go to** `/courses/create`
3. **Fill in** the course form
4. **Click** "Create Course"
5. **Check** if the 500 error is resolved

## 🚨 Troubleshooting

### If you still get 500 errors:

1. **Check** Supabase logs in the dashboard
2. **Verify** the `courses` table exists
3. **Check** if RLS policies are correctly set
4. **Ensure** your user has the correct role in the `users` table

### Common Issues:

- **"relation 'courses' does not exist"** → Run the schema SQL
- **"new row violates row-level security policy"** → Set up RLS policies
- **"permission denied"** → Check user role in `users` table

## 📋 Quick Checklist

- [ ] Run `supabase-schema.sql` in Supabase SQL Editor
- [ ] Set up RLS policies for courses table
- [ ] Create a test user with instructor role
- [ ] Test course creation
- [ ] Check Supabase logs if errors persist

---

**Need Help?** Check the Supabase documentation or contact support.


























