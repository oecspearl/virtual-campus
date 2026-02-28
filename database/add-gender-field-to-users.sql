-- Add gender field to users table
-- This adds a gender column to support CSV upload with gender information

-- Add gender column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Create index for gender field for better performance
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

-- Update the enrollment table to include gender information for denormalization
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS student_gender VARCHAR(20);

-- Create index for student_gender in enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_student_gender ON enrollments(student_gender);

-- Drop the existing view if it exists to avoid column conflicts
DROP VIEW IF EXISTS enrollment_details;

-- Recreate the enrollment_details view to include gender
CREATE VIEW enrollment_details AS
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
    e.student_gender,
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
