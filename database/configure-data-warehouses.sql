-- ============================================================================
-- Data Warehouse Configurations
-- ============================================================================
-- This script sets up data warehouse connections for ETL pipelines
-- Configure your warehouse credentials and connection details
-- ============================================================================

-- ============================================================================
-- Snowflake Configuration
-- ============================================================================
-- Get credentials from: https://app.snowflake.com/

INSERT INTO public.data_warehouse_configs (
  name,
  warehouse_type,
  connection_config,
  is_active,
  sync_frequency
) VALUES (
  'Snowflake Production',
  'snowflake',
  '{
    "account": "your-account.snowflakecomputing.com",
    "username": "your-username",
    "password": "your-password",
    "warehouse": "COMPUTE_WH",
    "database": "ANALYTICS",
    "schema": "PUBLIC",
    "role": "ACCOUNTADMIN",
    "region": "us-east-1",
    "connection_timeout": 60,
    "max_connections": 10
  }'::jsonb,
  true,
  'daily'
) ON CONFLICT (name) DO UPDATE SET
  warehouse_type = EXCLUDED.warehouse_type,
  connection_config = EXCLUDED.connection_config,
  is_active = EXCLUDED.is_active,
  sync_frequency = EXCLUDED.sync_frequency,
  updated_at = now();

-- ============================================================================
-- Google BigQuery Configuration
-- ============================================================================
-- Get credentials from: https://console.cloud.google.com/

INSERT INTO public.data_warehouse_configs (
  name,
  warehouse_type,
  connection_config,
  is_active,
  sync_frequency
) VALUES (
  'BigQuery Production',
  'bigquery',
  '{
    "project_id": "your-project-id",
    "dataset_id": "analytics",
    "location": "US",
    "credentials_path": "/path/to/service-account-key.json",
    "credentials_json": "{\"type\":\"service_account\",\"project_id\":\"...\"}",
    "use_legacy_sql": false,
    "maximum_bytes_billed": 1000000000
  }'::jsonb,
  true,
  'daily'
) ON CONFLICT (name) DO UPDATE SET
  warehouse_type = EXCLUDED.warehouse_type,
  connection_config = EXCLUDED.connection_config,
  is_active = EXCLUDED.is_active,
  sync_frequency = EXCLUDED.sync_frequency,
  updated_at = now();

-- ============================================================================
-- Amazon Redshift Configuration
-- ============================================================================
-- Get credentials from: https://console.aws.amazon.com/redshift/

INSERT INTO public.data_warehouse_configs (
  name,
  warehouse_type,
  connection_config,
  is_active,
  sync_frequency
) VALUES (
  'Redshift Production',
  'redshift',
  '{
    "host": "your-cluster.xxxxx.us-east-1.redshift.amazonaws.com",
    "port": 5439,
    "database": "analytics",
    "user": "admin",
    "password": "your-password",
    "ssl": true,
    "timeout": 60,
    "max_connections": 10
  }'::jsonb,
  true,
  'daily'
) ON CONFLICT (name) DO UPDATE SET
  warehouse_type = EXCLUDED.warehouse_type,
  connection_config = EXCLUDED.connection_config,
  is_active = EXCLUDED.is_active,
  sync_frequency = EXCLUDED.sync_frequency,
  updated_at = now();

-- ============================================================================
-- Databricks Configuration
-- ============================================================================
-- Get credentials from: https://workspace.cloud.databricks.com/

INSERT INTO public.data_warehouse_configs (
  name,
  warehouse_type,
  connection_config,
  is_active,
  sync_frequency
) VALUES (
  'Databricks Production',
  'databricks',
  '{
    "server_hostname": "your-workspace.cloud.databricks.com",
    "http_path": "/sql/1.0/warehouses/your-warehouse-id",
    "access_token": "your-personal-access-token",
    "catalog": "hive_metastore",
    "schema": "default",
    "timeout": 60
  }'::jsonb,
  true,
  'daily'
) ON CONFLICT (name) DO UPDATE SET
  warehouse_type = EXCLUDED.warehouse_type,
  connection_config = EXCLUDED.connection_config,
  is_active = EXCLUDED.is_active,
  sync_frequency = EXCLUDED.sync_frequency,
  updated_at = now();

-- ============================================================================
-- ETL Pipeline Schedules
-- ============================================================================

-- Schedule: Daily sync of student performance data to Snowflake
INSERT INTO public.etl_pipeline_schedules (
  warehouse_id,
  pipeline_name,
  schedule_type,
  schedule_config,
  is_active,
  next_run_at
) 
SELECT 
  id,
  'student_performance_daily',
  'cron',
  '{
    "cron_expression": "0 2 * * *",
    "timezone": "UTC",
    "description": "Daily sync at 2 AM UTC"
  }'::jsonb,
  true,
  -- Calculate next run (2 AM UTC tomorrow)
  (CURRENT_DATE + INTERVAL '1 day')::timestamp + INTERVAL '2 hours'
FROM public.data_warehouse_configs
WHERE name = 'Snowflake Production'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Schedule: Hourly sync of engagement metrics to BigQuery
INSERT INTO public.etl_pipeline_schedules (
  warehouse_id,
  pipeline_name,
  schedule_type,
  schedule_config,
  is_active,
  next_run_at
)
SELECT 
  id,
  'engagement_metrics_hourly',
  'cron',
  '{
    "cron_expression": "0 * * * *",
    "timezone": "UTC",
    "description": "Hourly sync"
  }'::jsonb,
  true,
  -- Calculate next run (next hour)
  date_trunc('hour', now()) + INTERVAL '1 hour'
FROM public.data_warehouse_configs
WHERE name = 'BigQuery Production'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Schedule: Weekly sync of course analytics to Redshift
INSERT INTO public.etl_pipeline_schedules (
  warehouse_id,
  pipeline_name,
  schedule_type,
  schedule_config,
  is_active,
  next_run_at
)
SELECT 
  id,
  'course_analytics_weekly',
  'cron',
  '{
    "cron_expression": "0 3 * * 0",
    "timezone": "UTC",
    "description": "Weekly sync on Sunday at 3 AM UTC"
  }'::jsonb,
  true,
  -- Calculate next run (next Sunday at 3 AM)
  (CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7)::timestamp + INTERVAL '3 hours'
FROM public.data_warehouse_configs
WHERE name = 'Redshift Production'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- View Current Configurations
-- ============================================================================

-- View all warehouse configurations (without sensitive data)
SELECT 
  id,
  name,
  warehouse_type,
  is_active,
  sync_frequency,
  last_sync_at,
  created_at,
  updated_at
FROM public.data_warehouse_configs
ORDER BY name;

-- View all ETL schedules
SELECT 
  s.id,
  s.pipeline_name,
  w.name as warehouse_name,
  s.schedule_type,
  s.schedule_config,
  s.is_active,
  s.last_run_at,
  s.next_run_at
FROM public.etl_pipeline_schedules s
JOIN public.data_warehouse_configs w ON s.warehouse_id = w.id
ORDER BY s.next_run_at;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Snowflake:
--    - Sign up at https://www.snowflake.com/
--    - Create warehouse, database, and schema
--    - Get connection details from Snowflake console
--    - Use service account for production
--
-- 2. BigQuery:
--    - Create project in Google Cloud Console
--    - Enable BigQuery API
--    - Create service account and download JSON key
--    - Store credentials securely (encrypt in production)
--
-- 3. Redshift:
--    - Create cluster in AWS Console
--    - Get cluster endpoint and credentials
--    - Configure security groups for access
--    - Use IAM roles for production
--
-- 4. Databricks:
--    - Create workspace in Databricks
--    - Create SQL warehouse
--    - Generate personal access token
--    - Get HTTP path from warehouse settings
--
-- 5. Security:
--    - Encrypt connection_config in production
--    - Use environment variables for sensitive data
--    - Rotate credentials regularly
--    - Monitor access logs
--    - Use service accounts with minimal permissions
--
-- 6. ETL Schedules:
--    - Cron expressions use UTC timezone
--    - Format: "minute hour day month weekday"
--    - Test schedules before activating
--    - Monitor pipeline execution logs

