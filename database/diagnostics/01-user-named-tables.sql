-- 1. Every table/view named users (or close to it) in any schema. Should be
--    exactly two: auth.users (managed by Supabase) and public.users (ours).
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name ILIKE '%user%'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
