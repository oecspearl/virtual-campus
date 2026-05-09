-- 9. user_oauth_identities entries whose stored email no longer matches
--    the linked user's email. Indicates either a stale identity row or
--    a botched email-match link in createOAuthSession.
SELECT
  uoi.user_id,
  uoi.provider_type,
  uoi.email AS identity_email,
  u.email   AS user_email
FROM public.user_oauth_identities uoi
JOIN public.users u ON u.id = uoi.user_id
WHERE LOWER(COALESCE(uoi.email, '')) <> LOWER(COALESCE(u.email, ''))
LIMIT 50;
