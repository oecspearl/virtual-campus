-- 5. Case-insensitive duplicate emails inside public.users (the UNIQUE
--    constraint on email is case-sensitive in default Postgres collation).
SELECT
  LOWER(email) AS email_lower,
  COUNT(*)     AS row_count,
  ARRAY_AGG(id) AS ids
FROM public.users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
LIMIT 50;
