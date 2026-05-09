-- 3a. auth.users rows with no matching public.users row. These users have
--     valid Supabase sessions but will be JIT-provisioned (with empty name
--     if user_metadata is sparse) on their first API call.
SELECT
  COUNT(*) AS auth_users_missing_app_row
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
