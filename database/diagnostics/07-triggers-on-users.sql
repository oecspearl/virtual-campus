-- 7. Triggers on public.users and auth.users — anything sync-related could
--    be silently overwriting fields.
SELECT
  event_object_schema AS schema,
  event_object_table  AS table,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema IN ('auth', 'public')
ORDER BY schema, trigger_name;
