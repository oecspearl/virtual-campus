-- Simple SQL to add Keith Thomas as admin user
-- Replace 'AUTH_USER_UUID' with the actual UUID from Supabase Auth

-- Insert Keith Thomas into the users table
INSERT INTO users (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    'AUTH_USER_UUID', -- Replace with actual UUID from Supabase Auth
    'keith.thomas@oecs.int',
    'Keith Thomas',
    'admin',
    NOW(),
    NOW()
);

-- Create user profile
INSERT INTO user_profiles (
    user_id,
    bio,
    avatar,
    learning_preferences,
    created_at,
    updated_at
) VALUES (
    'AUTH_USER_UUID', -- Same UUID as above
    'Administrator for OECS LearnBoard - MERL Specialist',
    NULL,
    '{"notifications": true, "theme": "light", "language": "en"}'::jsonb,
    NOW(),
    NOW()
);
