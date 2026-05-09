-- 3b. public.users rows with no matching auth.users row. These can't ever
--     log in — orphans from imports or deleted auth users.
SELECT
  COUNT(*) AS app_users_missing_auth_row
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL;
