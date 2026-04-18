# Analytics, Data Warehousing, and Enhanced Notifications Implementation

This document describes the implementation of enterprise-level analytics, data warehousing, and omnichannel notifications.

## 📊 Analytics & Data Warehousing

### Database Schema

Run the migration file to create all necessary tables:

```sql
-- Run in Supabase SQL Editor
\i database/analytics-notifications-schema.sql
```

### Features Implemented

#### 1. Data Warehouse ETL Pipelines

**Tables:**
- `data_warehouse_configs` - Configuration for warehouses (Snowflake, BigQuery, etc.)
- `etl_pipeline_jobs` - Execution logs
- `etl_pipeline_schedules` - Scheduled pipeline runs

**Usage:**
```typescript
import { runETLPipeline, getDataWarehouseConfig } from '@/lib/analytics/etl';

// Configure warehouse
const warehouse = await getDataWarehouseConfig(warehouseId);

// Run pipeline
await runETLPipeline(warehouseId, {
  name: 'student_performance',
  source_tables: ['users', 'course_grades', 'enrollments'],
  target_schema: 'analytics',
  target_table: 'student_performance',
  transformation: (data) => {
    // Transform data
    return data.map(row => ({
      ...row,
      calculated_field: row.field1 + row.field2,
    }));
  },
});
```

**API Endpoints:**
- `POST /api/etl/pipeline` - Run ETL pipeline
- `GET /api/etl/pipeline` - Get pipeline execution history

#### 2. Learning Analytics & Risk Prediction

**Tables:**
- `student_risk_indicators` - At-risk student predictions
- `learning_analytics_models` - ML model configurations
- `learning_analytics_predictions` - Prediction results
- `engagement_metrics` - Daily engagement tracking

**Features:**
- Automatic risk calculation based on:
  - Engagement scores
  - Performance metrics
  - Assignment completion
  - Attendance patterns
- Risk levels: Low, Medium, High, Critical
- Predicted grades
- Confidence scores

**Usage:**
```typescript
import { calculateStudentRisk, getAtRiskStudents } from '@/lib/analytics/risk-prediction';

// Calculate risk for a student
const risk = await calculateStudentRisk(studentId, courseId);
console.log(`Risk Level: ${risk.risk_level}, Score: ${risk.risk_score}`);

// Get all at-risk students
const atRisk = await getAtRiskStudents(courseId, 'high');
```

**API Endpoints:**
- `GET /api/analytics/at-risk` - Get at-risk students
- `POST /api/analytics/at-risk` - Calculate risk for specific student

#### 3. Custom Report Builder

**Tables:**
- `custom_reports` - Report definitions
- `custom_report_executions` - Execution logs

**Features:**
- Visual report builder
- Column selection
- Filtering
- Grouping and aggregation
- Sorting
- Chart visualization
- Report sharing

**Usage:**
```typescript
// Create report
const report = await fetch('/api/reports/custom', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Student Performance Report',
    report_type: 'student',
    base_table: 'course_grades',
    columns: ['student_id', 'course_id', 'score', 'max_score'],
    filters: [
      { column: 'course_id', operator: 'eq', value: courseId }
    ],
    order_by: [{ column: 'score', direction: 'desc' }],
    chart_type: 'bar',
  }),
});

// Execute report
const results = await fetch(`/api/reports/custom/${reportId}/execute`, {
  method: 'POST',
});
```

**API Endpoints:**
- `GET /api/reports/custom` - List reports
- `POST /api/reports/custom` - Create report
- `POST /api/reports/custom/[id]/execute` - Execute report

## 📱 Omnichannel Notifications

### Database Schema

Enhanced `notification_preferences` table with:
- `sms_enabled` - SMS notifications
- `whatsapp_enabled` - WhatsApp notifications
- `push_enabled` - Push notifications
- `phone_number` - User phone number
- `whatsapp_number` - WhatsApp number
- `push_tokens` - Device tokens

**New Tables:**
- `notification_channels` - Channel configurations
- `omnichannel_notifications` - Unified notification log
- `sms_notifications` - SMS-specific logs
- `whatsapp_notifications` - WhatsApp-specific logs
- `push_notifications` - Push notification logs

### Features

#### Supported Channels

1. **Email** (existing)
2. **SMS** - Via Twilio, Vonage, etc.
3. **WhatsApp** - Via WhatsApp Business API
4. **Push** - Via Firebase Cloud Messaging
5. **In-App** (existing)

#### Usage

```typescript
import { sendOmnichannelNotification } from '@/lib/notifications/omnichannel';

await sendOmnichannelNotification({
  userId: 'user-id',
  type: 'assignment_due',
  title: 'Assignment Due Soon',
  message: 'Your assignment is due in 24 hours',
  linkUrl: '/assignments/123',
  channels: {
    email: true,
    sms: true,
    whatsapp: false,
    push: true,
    in_app: true,
  },
  priority: 'high',
});
```

**API Endpoints:**
- `POST /api/notifications/omnichannel` - Send omnichannel notification

### Setup Instructions

#### SMS (Twilio)

1. Sign up for Twilio: https://twilio.com
2. Get Account SID and Auth Token
3. Configure in database:

```sql
INSERT INTO notification_channels (channel_type, provider, api_key, api_secret, configuration)
VALUES (
  'sms',
  'twilio',
  'your_account_sid',
  'your_auth_token',
  '{"from_number": "+1234567890"}'::jsonb
);
```

#### WhatsApp Business API

1. Set up WhatsApp Business Account
2. Get API credentials
3. Configure in database (similar to SMS)

#### Push Notifications (Firebase)

1. Set up Firebase project
2. Get service account key
3. Configure in database

## 📢 Global Announcements

### Database Schema

**Tables:**
- `global_announcements` - Announcement definitions
- `announcement_views` - User view/dismiss tracking

### Features

- System-wide announcements
- Role-based targeting
- Tenant-based targeting (multi-tenant)
- Course-specific announcements
- User-specific announcements
- Scheduled announcements
- Dismissible announcements
- Login page announcements
- Dashboard announcements
- Automatic notifications

### Usage

```typescript
import { createGlobalAnnouncement, getActiveAnnouncementsForUser } from '@/lib/announcements/global';

// Create announcement
const announcementId = await createGlobalAnnouncement({
  title: 'System Maintenance',
  message: 'Scheduled maintenance on Saturday 2-4 AM',
  announcement_type: 'maintenance',
  target_roles: ['student', 'instructor'],
  priority: 'high',
  show_on_login: true,
  send_notification: true,
  notification_channels: ['email', 'in_app'],
});

// Get user's announcements
const announcements = await getActiveAnnouncementsForUser(userId, userRole);
```

**API Endpoints:**
- `GET /api/announcements` - Get active announcements for user
- `POST /api/announcements` - Create announcement (admin only)
- `POST /api/announcements/[id]/dismiss` - Dismiss announcement

## 🎯 Key Features Summary

### Analytics
✅ Data warehouse ETL pipelines (Snowflake, BigQuery, etc.)
✅ Learning analytics and risk prediction
✅ Engagement metrics tracking
✅ Custom report builder
✅ At-risk student identification
✅ Predictive grade forecasting

### Notifications
✅ Multi-channel notifications (Email, SMS, WhatsApp, Push, In-App)
✅ User preference management
✅ Channel-specific logging
✅ Delivery status tracking
✅ Rate limiting support

### Announcements
✅ Global system announcements
✅ Role-based targeting
✅ Scheduled announcements
✅ Dismissible announcements
✅ Multi-channel delivery

## 🚀 Next Steps

1. **Run Database Migration:**
   ```sql
   -- In Supabase SQL Editor
   \i database/analytics-notifications-schema.sql
   ```

2. **Configure Notification Channels:**
   - Set up Twilio for SMS
   - Set up WhatsApp Business API
   - Set up Firebase for Push notifications

3. **Configure Data Warehouse:**
   - Add warehouse configurations
   - Set up ETL schedules
   - Test pipeline execution

4. **Build UI Components:**
   - At-risk students dashboard
   - Custom report builder UI
   - Announcements management UI
   - Notification preferences UI

5. **Integrate ML Models:**
   - Train risk prediction models
   - Deploy models
   - Set up automated predictions

## 📝 Notes

- ETL pipelines require actual warehouse SDKs (snowflake-sdk, @google-cloud/bigquery, etc.)
- SMS/WhatsApp/Push require service provider setup
- Risk prediction uses simplified algorithms - can be enhanced with ML models
- All features include RLS (Row-Level Security) policies
- Audit logging is included for compliance

## 🔐 Security

- All tables have RLS enabled
- Admin-only access for ETL and announcements
- User-specific data access controls
- Encrypted API keys in database
- Rate limiting on notification channels

