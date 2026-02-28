-- ============================================================================
-- OECS Learning Hub - Test User Setup Instructions
-- ============================================================================
-- Since Supabase manages auth.users internally, we need to create users
-- through the Supabase Dashboard first, then run this script to create
-- their profiles.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Users in Supabase Dashboard
-- ============================================================================
-- Go to: Authentication > Users > Add User
-- Create these users (check "Auto Confirm User"):
--
-- 1. admin@oecslearning.org - Password: Test123!
-- 2. instructor@oecslearning.org - Password: Test123!
-- 3. student@oecslearning.org - Password: Test123!
-- 4. designer@oecslearning.org - Password: Test123!
--
-- After creating each user, note their UUID from the dashboard
-- ============================================================================

-- ============================================================================
-- STEP 2: Run this script to create user profiles
-- ============================================================================
-- Replace the UUIDs below with the actual UUIDs from your auth.users
-- ============================================================================

-- Get the user IDs from auth.users (run this first to see the UUIDs)
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%@oecslearning.org'
ORDER BY email;

-- ============================================================================
-- STEP 3: Create User Profiles
-- ============================================================================
-- After you have the UUIDs, uncomment and run the INSERT statements below
-- Replace 'REPLACE_WITH_ACTUAL_UUID' with the real UUIDs from Step 2
-- ============================================================================

/*
-- Admin Profile
INSERT INTO public.users (id, email, name, role, gender, created_at, updated_at)
VALUES (
  'REPLACE_WITH_ADMIN_UUID'::uuid,
  'admin@oecslearning.org',
  'System Administrator',
  'super_admin',
  'prefer_not_to_say',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- Instructor Profile
INSERT INTO public.users (id, email, name, role, gender, created_at, updated_at)
VALUES (
  'REPLACE_WITH_INSTRUCTOR_UUID'::uuid,
  'instructor@oecslearning.org',
  'John Teacher',
  'instructor',
  'male',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- Student Profile
INSERT INTO public.users (id, email, name, role, gender, created_at, updated_at)
VALUES (
  'REPLACE_WITH_STUDENT_UUID'::uuid,
  'student@oecslearning.org',
  'Jane Student',
  'student',
  'female',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- Curriculum Designer Profile
INSERT INTO public.users (id, email, name, role, gender, created_at, updated_at)
VALUES (
  'REPLACE_WITH_DESIGNER_UUID'::uuid,
  'designer@oecslearning.org',
  'Sarah Designer',
  'curriculum_designer',
  'female',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- ============================================================================
-- STEP 4: Create Extended User Profiles
-- ============================================================================

-- Admin User Profile
INSERT INTO public.user_profiles (user_id, bio, avatar, learning_preferences, created_at, updated_at)
VALUES (
  'REPLACE_WITH_ADMIN_UUID'::uuid,
  'System administrator with full access to all platform features.',
  null,
  '{"theme": "light", "notifications": true}'::jsonb,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  learning_preferences = EXCLUDED.learning_preferences,
  updated_at = now();

-- Instructor User Profile
INSERT INTO public.user_profiles (user_id, bio, avatar, learning_preferences, created_at, updated_at)
VALUES (
  'REPLACE_WITH_INSTRUCTOR_UUID'::uuid,
  'Experienced educator passionate about online learning.',
  null,
  '{"theme": "light", "notifications": true}'::jsonb,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  learning_preferences = EXCLUDED.learning_preferences,
  updated_at = now();

-- Student User Profile
INSERT INTO public.user_profiles (user_id, bio, avatar, learning_preferences, created_at, updated_at)
VALUES (
  'REPLACE_WITH_STUDENT_UUID'::uuid,
  'Eager learner exploring new subjects.',
  null,
  '{"theme": "light", "notifications": true, "learning_style": "visual"}'::jsonb,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  learning_preferences = EXCLUDED.learning_preferences,
  updated_at = now();

-- Curriculum Designer User Profile
INSERT INTO public.user_profiles (user_id, bio, avatar, learning_preferences, created_at, updated_at)
VALUES (
  'REPLACE_WITH_DESIGNER_UUID'::uuid,
  'Curriculum designer creating engaging educational content.',
  null,
  '{"theme": "light", "notifications": true}'::jsonb,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  learning_preferences = EXCLUDED.learning_preferences,
  updated_at = now();
*/

-- ============================================================================
-- Verify Users and Profiles
-- ============================================================================

SELECT 
  au.id,
  au.email as auth_email,
  au.created_at as auth_created,
  u.name,
  u.role,
  up.bio
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE au.email LIKE '%@oecslearning.org'
ORDER BY u.role, au.email;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
