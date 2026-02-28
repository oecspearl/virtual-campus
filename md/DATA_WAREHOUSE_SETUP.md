# Data Warehouse Setup Guide

This guide walks you through setting up data warehouses and ETL pipelines.

## 🏗️ Warehouse Options

### Supported Warehouses

1. **Snowflake** - Cloud data warehouse
2. **Google BigQuery** - Serverless data warehouse
3. **Amazon Redshift** - AWS data warehouse
4. **Databricks** - Unified analytics platform

## ❄️ Snowflake Setup

### Step 1: Create Account

1. Sign up at https://www.snowflake.com/
2. Choose cloud provider (AWS, Azure, GCP)
3. Select region
4. Complete account setup

### Step 2: Create Resources

1. **Create Warehouse:**
   ```sql
   CREATE WAREHOUSE COMPUTE_WH
   WITH WAREHOUSE_SIZE = 'X-SMALL'
   AUTO_SUSPEND = 60
   AUTO_RESUME = TRUE;
   ```

2. **Create Database:**
   ```sql
   CREATE DATABASE ANALYTICS;
   USE DATABASE ANALYTICS;
   ```

3. **Create Schema:**
   ```sql
   CREATE SCHEMA PUBLIC;
   USE SCHEMA PUBLIC;
   ```

### Step 3: Get Connection Details

1. Go to Snowflake Console
2. Click on your username → **Account**
3. Note your **Account Identifier** (format: `xxxxx.snowflakecomputing.com`)
4. Get your **Username** and **Password**

### Step 4: Configure in Database

Run the SQL script:

```sql
-- Edit database/configure-data-warehouses.sql
-- Replace placeholders with your Snowflake details
-- Then run in Supabase SQL Editor
```

Or manually:

```sql
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
    "role": "ACCOUNTADMIN"
  }'::jsonb,
  true,
  'daily'
);
```

### Step 5: Test Connection

```typescript
// Test via API
POST /api/etl/pipeline
{
  "warehouse_id": "warehouse-id",
  "pipeline": {
    "name": "test_connection",
    "source_tables": ["users"],
    "target_schema": "PUBLIC",
    "target_table": "test_table"
  }
}
```

## 📊 Google BigQuery Setup

### Step 1: Create Project

1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable billing (required for BigQuery)

### Step 2: Enable BigQuery API

1. Go to **APIs & Services** → **Library**
2. Search for "BigQuery API"
3. Click **Enable**

### Step 3: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g., "etl-service")
4. Grant role: **BigQuery Data Editor**
5. Click **Create Key** → **JSON**
6. Download JSON file (keep secure!)

### Step 4: Create Dataset

1. Go to BigQuery Console
2. Click **Create Dataset**
3. Name it (e.g., "analytics")
4. Choose location (e.g., "US")
5. Click **Create**

### Step 5: Configure in Database

```sql
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
    "credentials_json": "{\"type\":\"service_account\",...}"
  }'::jsonb,
  true,
  'daily'
);
```

**Note:** Store credentials securely. In production, use encrypted storage or environment variables.

## 🔴 Amazon Redshift Setup

### Step 1: Create Cluster

1. Go to AWS Console → Redshift
2. Click **Create cluster**
3. Configure:
   - Cluster identifier
   - Node type (dc2.large for testing)
   - Number of nodes
   - Master username and password
4. Configure network and security
5. Click **Create cluster**

### Step 2: Get Connection Details

1. Wait for cluster to be available
2. Go to cluster details
3. Note **Endpoint** (format: `cluster.xxxxx.us-east-1.redshift.amazonaws.com`)
4. Note **Port** (usually 5439)
5. Use master username and password

### Step 3: Configure Security

1. Go to **VPC Security Groups**
2. Add inbound rule:
   - Type: PostgreSQL
   - Port: 5439
   - Source: Your IP or VPC

### Step 4: Configure in Database

```sql
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
    "host": "cluster.xxxxx.us-east-1.redshift.amazonaws.com",
    "port": 5439,
    "database": "dev",
    "user": "admin",
    "password": "your-password",
    "ssl": true
  }'::jsonb,
  true,
  'daily'
);
```

## 🚀 Databricks Setup

### Step 1: Create Workspace

1. Sign up at https://databricks.com/
2. Create workspace
3. Choose cloud provider and region

### Step 2: Create SQL Warehouse

1. Go to **SQL** → **SQL Warehouses**
2. Click **Create SQL Warehouse**
3. Configure:
   - Name
   - Cluster size
   - Auto-stop timeout
4. Click **Create**

### Step 3: Get Connection Details

1. Click on warehouse
2. Go to **Connection Details**
3. Note:
   - **Server hostname**
   - **HTTP path**
4. Generate **Personal Access Token**

### Step 4: Configure in Database

```sql
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
    "access_token": "your-personal-access-token"
  }'::jsonb,
  true,
  'daily'
);
```

## ⏰ ETL Pipeline Schedules

### Create Schedule

```sql
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
  (CURRENT_DATE + INTERVAL '1 day')::timestamp + INTERVAL '2 hours'
FROM public.data_warehouse_configs
WHERE name = 'Snowflake Production'
LIMIT 1;
```

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 3 * * 0` - Weekly on Sunday at 3 AM
- `0 0 1 * *` - Monthly on 1st at midnight

### View Schedules

```sql
SELECT 
  s.id,
  s.pipeline_name,
  w.name as warehouse_name,
  s.schedule_type,
  s.schedule_config->>'cron_expression' as cron,
  s.is_active,
  s.last_run_at,
  s.next_run_at
FROM public.etl_pipeline_schedules s
JOIN public.data_warehouse_configs w ON s.warehouse_id = w.id
ORDER BY s.next_run_at;
```

## 🔄 Running ETL Pipelines

### Manual Execution

```typescript
// Via API
POST /api/etl/pipeline
{
  "warehouse_id": "warehouse-id",
  "pipeline": {
    "name": "student_performance",
    "source_tables": ["users", "course_grades", "enrollments"],
    "target_schema": "PUBLIC",
    "target_table": "student_performance",
    "transformation": null  // Optional transformation function
  }
}
```

### Scheduled Execution

Pipelines run automatically based on schedules. Monitor execution:

```sql
SELECT 
  id,
  pipeline_name,
  status,
  started_at,
  completed_at,
  duration_seconds,
  records_processed,
  records_failed,
  error_message
FROM public.etl_pipeline_jobs
ORDER BY started_at DESC
LIMIT 50;
```

## 🔐 Security Best Practices

### 1. Encrypt Credentials

Store credentials encrypted:

```typescript
import crypto from 'crypto';

function encryptConnectionConfig(config: any, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  const encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
  return encrypted + cipher.final('hex');
}
```

### 2. Use Service Accounts

- Create dedicated service accounts for ETL
- Grant minimal required permissions
- Rotate credentials regularly

### 3. Network Security

- Use VPC endpoints (AWS)
- Whitelist IP addresses
- Use SSL/TLS for all connections

### 4. Monitor Access

- Enable audit logging
- Monitor failed connections
- Set up alerts for suspicious activity

## 📊 Monitoring

### View Warehouse Status

```sql
SELECT 
  id,
  name,
  warehouse_type,
  is_active,
  last_sync_at,
  sync_frequency
FROM public.data_warehouse_configs;
```

### View Pipeline Jobs

```sql
SELECT 
  j.id,
  j.pipeline_name,
  w.name as warehouse,
  j.status,
  j.records_processed,
  j.records_failed,
  j.started_at,
  j.completed_at,
  j.duration_seconds
FROM public.etl_pipeline_jobs j
JOIN public.data_warehouse_configs w ON j.warehouse_id = w.id
WHERE j.started_at > NOW() - INTERVAL '7 days'
ORDER BY j.started_at DESC;
```

## 🐛 Troubleshooting

### Connection Failures

1. Verify credentials are correct
2. Check network connectivity
3. Verify firewall rules
4. Check warehouse status (not suspended)

### Slow Performance

1. Increase warehouse size (Snowflake)
2. Optimize queries
3. Use incremental syncs
4. Schedule during off-peak hours

### Data Quality Issues

1. Validate source data
2. Check transformation logic
3. Review error logs
4. Implement data quality checks

## 📚 Resources

- **Snowflake Docs:** https://docs.snowflake.com/
- **BigQuery Docs:** https://cloud.google.com/bigquery/docs
- **Redshift Docs:** https://docs.aws.amazon.com/redshift/
- **Databricks Docs:** https://docs.databricks.com/

