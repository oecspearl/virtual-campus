-- Complete SQL Script to Add Keith Thomas as Admin User
-- Run this in Supabase SQL Editor

-- Step 1: Create the user in the users table
INSERT INTO users (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'keith.thomas@oecs.int',
    'Keith Thomas',
    'admin',
    NOW(),
    NOW()
);

-- Step 2: Create user profile
INSERT INTO user_profiles (
    user_id,
    bio,
    avatar,
    learning_preferences,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'keith.thomas@oecs.int'),
    'Administrator for OECS LearnBoard - MERL Specialist',
    NULL,
    '{"notifications": true, "theme": "light", "language": "en"}'::jsonb,
    NOW(),
    NOW()
);

-- Step 3: Verify the user was created
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    up.bio,
    up.learning_preferences
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'keith.thomas@oecs.int';

-- IMPORTANT: After running this SQL, you need to create the user in Supabase Auth
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: keith.thomas@oecs.int
-- Password: merl_2025_Edmu
-- Email Confirmed: Yes
-- Then update the users table with the correct auth UUID:

-- UPDATE users 
-- SET id = 'AUTH_USER_UUID_FROM_SUPABASE' 
-- WHERE email = 'keith.thomas@oecs.int';

-- UPDATE user_profiles 
-- SET user_id = 'AUTH_USER_UUID_FROM_SUPABASE' 
-- WHERE user_id = (SELECT id FROM users WHERE email = 'keith.thomas@oecs.int');
