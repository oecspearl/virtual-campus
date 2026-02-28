-- SQL Query to add Keith Thomas as an admin user
-- This query should be run in the Supabase SQL Editor

-- First, create the user in Supabase Auth (this needs to be done through Supabase Dashboard or Admin API)
-- The password will be set during the auth user creation process
-- For now, we'll create the user record in our users table

-- Insert Keith Thomas into the users table
INSERT INTO users (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- Generate a new UUID for the user
    'keith.thomas@oecs.int',
    'Keith Thomas',
    'admin',
    NOW(),
    NOW()
);

-- Create a corresponding user_profiles record
INSERT INTO user_profiles (
    user_id,
    bio,
    avatar,
    learning_preferences,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'keith.thomas@oecs.int'),
    'Administrator for OECS LearnBoard',
    NULL,
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Verify the user was created successfully
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    up.bio,
    up.learning_preferences
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'keith.thomas@oecs.int';
