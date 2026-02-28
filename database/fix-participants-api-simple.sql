-- Fix Participants API - Ensure Required Columns Exist
-- This ensures the enrollments table has all the columns the API expects

-- First, let's check what columns currently exist
SELECT 
    'Current Columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add course_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'course_id') THEN
        ALTER TABLE enrollments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added course_id column';
    END IF;
    
    -- Add progress_percentage if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'progress_percentage') THEN
        ALTER TABLE enrollments ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        RAISE NOTICE 'Added progress_percentage column';
    END IF;
    
    -- Add completed_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'completed_at') THEN
        ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column';
    END IF;
    
    -- Add student_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_name') THEN
        ALTER TABLE enrollments ADD COLUMN student_name VARCHAR(255);
        RAISE NOTICE 'Added student_name column';
    END IF;
    
    -- Add student_email if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_email') THEN
        ALTER TABLE enrollments ADD COLUMN student_email VARCHAR(255);
        RAISE NOTICE 'Added student_email column';
    END IF;
    
    -- Add student_role if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_role') THEN
        ALTER TABLE enrollments ADD COLUMN student_role VARCHAR(50);
        RAISE NOTICE 'Added student_role column';
    END IF;
    
    -- Add student_bio if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_bio') THEN
        ALTER TABLE enrollments ADD COLUMN student_bio TEXT;
        RAISE NOTICE 'Added student_bio column';
    END IF;
    
    -- Add student_avatar if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_avatar') THEN
        ALTER TABLE enrollments ADD COLUMN student_avatar VARCHAR(500);
        RAISE NOTICE 'Added student_avatar column';
    END IF;
    
    -- Add learning_preferences if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'learning_preferences') THEN
        ALTER TABLE enrollments ADD COLUMN learning_preferences JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added learning_preferences column';
    END IF;
    
    -- Add user_created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'user_created_at') THEN
        ALTER TABLE enrollments ADD COLUMN user_created_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added user_created_at column';
    END IF;
    
    -- Add profile_created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'profile_created_at') THEN
        ALTER TABLE enrollments ADD COLUMN profile_created_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added profile_created_at column';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'updated_at') THEN
        ALTER TABLE enrollments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Show final column structure
SELECT 
    'Final Columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the exact query the API uses
SELECT 
    'API Query Test' as info,
    COUNT(*) as total_rows
FROM enrollments
WHERE course_id = 'b18abae6-6489-43ff-896b-ed3af74101b1';

-- Sample the data the API would return
SELECT 
    id,
    student_id,
    status,
    enrolled_at,
    progress_percentage,
    completed_at,
    student_name,
    student_email,
    student_role,
    student_bio,
    student_avatar,
    learning_preferences,
    user_created_at,
    profile_created_at,
    updated_at
FROM enrollments
WHERE course_id = 'b18abae6-6489-43ff-896b-ed3af74101b1'
LIMIT 3;
