-- SQL Query to Update Enrollments Table with User Information
-- This query adds user information from users and user_profiles tables to enrollments

-- First, let's check the current structure of enrollments table
-- and add any missing columns if needed

-- Add missing columns to enrollments table if they don't exist
DO $$ 
BEGIN
    -- Add course_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'course_id') THEN
        ALTER TABLE enrollments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
    
    -- Add progress_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'progress_percentage') THEN
        ALTER TABLE enrollments ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    END IF;
    
    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'completed_at') THEN
        ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add student_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_name') THEN
        ALTER TABLE enrollments ADD COLUMN student_name VARCHAR(255);
    END IF;
    
    -- Add student_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_email') THEN
        ALTER TABLE enrollments ADD COLUMN student_email VARCHAR(255);
    END IF;
    
    -- Add student_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_role') THEN
        ALTER TABLE enrollments ADD COLUMN student_role VARCHAR(50);
    END IF;
    
    -- Add student_bio column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_bio') THEN
        ALTER TABLE enrollments ADD COLUMN student_bio TEXT;
    END IF;
    
    -- Add student_avatar column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'student_avatar') THEN
        ALTER TABLE enrollments ADD COLUMN student_avatar VARCHAR(500);
    END IF;
    
    -- Add learning_preferences column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'learning_preferences') THEN
        ALTER TABLE enrollments ADD COLUMN learning_preferences JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add user_created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'user_created_at') THEN
        ALTER TABLE enrollments ADD COLUMN user_created_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add profile_created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'profile_created_at') THEN
        ALTER TABLE enrollments ADD COLUMN profile_created_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_email ON enrollments(student_email);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_name ON enrollments(student_name);

-- Update enrollments table with user information from users and user_profiles tables
UPDATE enrollments 
SET 
    -- Basic user information from users table
    student_name = u.name,
    student_email = u.email,
    student_role = u.role,
    user_created_at = u.created_at,
    
    -- Profile information from user_profiles table
    student_bio = up.bio,
    student_avatar = up.avatar,
    learning_preferences = COALESCE(up.learning_preferences, '{}'::jsonb),
    profile_created_at = up.created_at,
    
    -- Update the updated_at timestamp
    updated_at = NOW()
    
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE enrollments.student_id = u.id;

-- Optional: Create a view for easy querying of enrollment data with user information
CREATE OR REPLACE VIEW enrollment_details AS
SELECT 
    e.id as enrollment_id,
    e.course_id,
    e.student_id,
    e.enrolled_at,
    e.status,
    e.progress_percentage,
    e.completed_at,
    e.updated_at,
    
    -- User information
    e.student_name,
    e.student_email,
    e.student_role,
    e.user_created_at,
    
    -- Profile information
    e.student_bio,
    e.student_avatar,
    e.learning_preferences,
    e.profile_created_at,
    
    -- Course information (if course_id exists)
    c.title as course_title,
    c.description as course_description,
    c.grade_level,
    c.subject_area,
    c.difficulty as course_difficulty,
    c.thumbnail as course_thumbnail,
    c.syllabus as course_syllabus,
    c.published as course_published
    
FROM enrollments e
LEFT JOIN courses c ON e.course_id = c.id;

-- Optional: Create a function to automatically update enrollment user info when user data changes
CREATE OR REPLACE FUNCTION update_enrollment_user_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollments when user information changes
    UPDATE enrollments 
    SET 
        student_name = NEW.name,
        student_email = NEW.email,
        student_role = NEW.role,
        user_created_at = NEW.created_at,
        updated_at = NOW()
    WHERE student_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update enrollments when user data changes
DROP TRIGGER IF EXISTS trigger_update_enrollment_user_info ON users;
CREATE TRIGGER trigger_update_enrollment_user_info
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_user_info();

-- Optional: Create a function to update enrollments when user profile changes
CREATE OR REPLACE FUNCTION update_enrollment_profile_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollments when user profile information changes
    UPDATE enrollments 
    SET 
        student_bio = NEW.bio,
        student_avatar = NEW.avatar,
        learning_preferences = COALESCE(NEW.learning_preferences, '{}'::jsonb),
        profile_created_at = NEW.created_at,
        updated_at = NOW()
    WHERE student_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update enrollments when user profile changes
DROP TRIGGER IF EXISTS trigger_update_enrollment_profile_info ON user_profiles;
CREATE TRIGGER trigger_update_enrollment_profile_info
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_profile_info();

-- Query to verify the update worked correctly
SELECT 
    'Enrollment Update Summary' as summary,
    COUNT(*) as total_enrollments,
    COUNT(CASE WHEN student_name IS NOT NULL THEN 1 END) as enrollments_with_name,
    COUNT(CASE WHEN student_email IS NOT NULL THEN 1 END) as enrollments_with_email,
    COUNT(CASE WHEN student_bio IS NOT NULL THEN 1 END) as enrollments_with_bio,
    COUNT(CASE WHEN learning_preferences IS NOT NULL THEN 1 END) as enrollments_with_preferences
FROM enrollments;

-- Sample query to see the updated enrollment data
SELECT 
    enrollment_id,
    course_title,
    course_description,
    student_name,
    student_email,
    student_role,
    status,
    progress_percentage,
    enrolled_at,
    student_bio,
    learning_preferences
FROM enrollment_details
ORDER BY enrolled_at DESC
LIMIT 10;
