-- 4. Same id, different email. Indicates the public.users row drifted from
--    the source-of-truth auth.users (e.g. user changed email in Supabase
--    but our row never updated).
SELECT
  pu.id,
  pu.email   AS public_email,
  au.email   AS auth_email
FROM public.users pu
JOIN auth.users au ON au.id = pu.id
WHERE LOWER(COALESCE(pu.email, '')) <> LOWER(COALESCE(au.email, ''))
LIMIT 50;
