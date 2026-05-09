-- 6. public.users rows with no tenant_memberships entry. These users would
--    not appear in tenant-scoped admin lists even though they exist.
SELECT
  COUNT(*) AS no_membership_count
FROM public.users u
LEFT JOIN public.tenant_memberships tm ON tm.user_id = u.id
WHERE tm.user_id IS NULL;
