-- 2. Foreign keys referencing either auth.users(id) or public.users(id). If
--    some app tables point at auth.users and others at public.users, any
--    code that joins across them will drop rows when the two ids drift.
SELECT
  tc.table_schema AS from_schema,
  tc.table_name   AS from_table,
  kcu.column_name AS from_column,
  ccu.table_schema AS to_schema,
  ccu.table_name   AS to_table,
  ccu.column_name  AS to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND ccu.table_schema IN ('auth', 'public')
ORDER BY ccu.table_schema, tc.table_schema, tc.table_name;
