-- Fix enrollments where student_name is "Unknown Student" or NULL
-- This updates the denormalized columns with actual user data from the users and user_profiles tables

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
WHERE enrollments.student_id = u.id
AND (enrollments.student_name IS NULL OR enrollments.student_name = 'Unknown Student');

-- Verify the update
SELECT 
    COUNT(*) as total_enrollments,
    COUNT(*) FILTER (WHERE student_name IS NULL OR student_name = 'Unknown Student') as unknown_student_count,
    COUNT(*) FILTER (WHERE student_name IS NOT NULL AND student_name != 'Unknown Student') as fixed_count
FROM enrollments;

