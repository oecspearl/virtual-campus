-- 8. Empty-name users by tenant — the actual visible symptom. Compare
--    against total user count per tenant to see how widespread it is.
SELECT
  u.tenant_id,
  COUNT(*) FILTER (WHERE TRIM(COALESCE(u.name, '')) = '') AS empty_name_count,
  COUNT(*)                                                AS total_users
FROM public.users u
GROUP BY u.tenant_id
ORDER BY empty_name_count DESC;
