# Quick Setup Guide - Notifications & Data Warehouses

Quick reference for setting up notification channels and data warehouses.

## 🚀 Quick Start

### 1. Run Database Migrations

```sql
-- First, run the main schema
\i database/analytics-notifications-schema.sql

-- Then configure notification channels
\i database/configure-notification-channels.sql

-- Finally, configure data warehouses
\i database/configure-data-warehouses.sql
```

### 2. Configure Notification Channels

#### SMS (Twilio) - 5 Minutes

1. Sign up: https://www.twilio.com/
2. Get Account SID & Auth Token from dashboard
3. Get phone number
4. Update `database/configure-notification-channels.sql`:
   ```sql
   -- Replace these values:
   'YOUR_TWILIO_ACCOUNT_SID'
   'YOUR_TWILIO_AUTH_TOKEN'
   '+1234567890'  -- Your Twilio number
   ```
5. Run the SQL script

#### WhatsApp (Twilio) - 10 Minutes

1. Use same Twilio account
2. Enable WhatsApp in Twilio Console
3. Use sandbox number for testing: `whatsapp:+14155238886`
4. Update configuration in SQL script
5. Run the SQL script

#### Push (Firebase) - 15 Minutes

1. Create project: https://console.firebase.google.com/
2. Enable Cloud Messaging
3. Get Server Key (Legacy) or Service Account JSON
4. Update configuration in SQL script
5. Run the SQL script

### 3. Configure Data Warehouses

#### Snowflake - 10 Minutes

1. Sign up: https://www.snowflake.com/
2. Create warehouse, database, schema
3. Get connection details
4. Update `database/configure-data-warehouses.sql`
5. Run the SQL script

#### BigQuery - 10 Minutes

1. Create project: https://console.cloud.google.com/
2. Enable BigQuery API
3. Create service account, download JSON key
4. Create dataset
5. Update configuration in SQL script
6. Run the SQL script

## 📋 Configuration Checklist

### Notification Channels

- [ ] Twilio account created
- [ ] SMS channel configured
- [ ] WhatsApp channel configured (optional)
- [ ] Firebase project created
- [ ] Push channel configured
- [ ] Test SMS sent successfully
- [ ] Test Push notification received

### Data Warehouses

- [ ] Warehouse account created (Snowflake/BigQuery/Redshift/Databricks)
- [ ] Warehouse configured in database
- [ ] Connection tested successfully
- [ ] ETL schedule created
- [ ] First pipeline run successful

## 🧪 Quick Tests

### Test SMS

```bash
curl -X POST http://localhost:3000/api/notifications/omnichannel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user-id",
    "type": "test",
    "title": "Test",
    "message": "Hello!",
    "channels": {"sms": true}
  }'
```

### Test ETL Pipeline

```bash
curl -X POST http://localhost:3000/api/etl/pipeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "warehouse_id": "warehouse-id",
    "pipeline": {
      "name": "test",
      "source_tables": ["users"],
      "target_schema": "PUBLIC",
      "target_table": "test_table"
    }
  }'
```

## 📊 Verify Configuration

### Check Notification Channels

```sql
SELECT 
  channel_type,
  provider,
  is_active,
  updated_at
FROM public.notification_channels;
```

### Check Data Warehouses

```sql
SELECT 
  name,
  warehouse_type,
  is_active,
  last_sync_at
FROM public.data_warehouse_configs;
```

### Check ETL Schedules

```sql
SELECT 
  s.pipeline_name,
  w.name as warehouse,
  s.schedule_config->>'cron_expression' as schedule,
  s.next_run_at
FROM public.etl_pipeline_schedules s
JOIN public.data_warehouse_configs w ON s.warehouse_id = w.id;
```

## 🔐 Security Reminders

1. **Never commit credentials to git**
2. **Use environment variables in production**
3. **Encrypt sensitive data in database**
4. **Rotate credentials every 90 days**
5. **Monitor usage for suspicious activity**

## 📚 Detailed Guides

- **Notification Channels:** See `md/NOTIFICATION_CHANNELS_SETUP.md`
- **Data Warehouses:** See `md/DATA_WAREHOUSE_SETUP.md`

## 🆘 Need Help?

1. Check the detailed setup guides
2. Review troubleshooting sections
3. Check service provider documentation
4. Review API logs in Supabase

