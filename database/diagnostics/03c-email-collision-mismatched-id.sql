-- 3c. Same email, different id between the two tables. This is the
--     "double user" scenario where the OAuth flow's email-match path
--     finds one row but the magic-link session is for a different id.
SELECT
  pu.id  AS public_id,
  au.id  AS auth_id,
  pu.email
FROM public.users pu
JOIN auth.users au ON LOWER(au.email) = LOWER(pu.email)
WHERE pu.id <> au.id
LIMIT 50;
