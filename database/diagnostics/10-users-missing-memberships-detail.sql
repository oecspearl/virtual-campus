-- 10. Identify the users with no tenant_memberships row.
--     Run this BEFORE migration 055 to see who's affected; run again AFTER
--     to confirm the backfill worked (should return zero rows).
SELECT
  u.id,
  u.email,
  u.name,
  u.role        AS users_role,
  u.tenant_id,
  u.created_at,
  au.last_sign_in_at
FROM public.users u
LEFT JOIN public.tenant_memberships tm ON tm.user_id = u.id
LEFT JOIN auth.users au ON au.id = u.id
WHERE tm.user_id IS NULL
ORDER BY u.created_at;
