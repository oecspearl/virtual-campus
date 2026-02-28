-- ============================================================================
-- Migration 010: Global Discussions + Advanced Analytics & Omnichannel
-- ============================================================================
-- Depends on: 001 (tenants, users), 004 (announcement_views), 006 (custom_reports)
-- ============================================================================
-- Tables NOT recreated (already exist in other migrations):
--   - notification_preferences (006)
--   - custom_reports, report_schedules, student_risk_scores, ai_insights (006)
--   - announcement_views (004)
--   - All basic analytics tables (006)
-- ============================================================================


-- ############################################################################
-- PART A: GLOBAL DISCUSSIONS (5 tables)
-- ############################################################################

-- --------------------------------------------------------------------------
-- 1. Global Discussion Categories
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_discussion_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_tenant ON global_discussion_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_slug ON global_discussion_categories(slug);
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_order ON global_discussion_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_global_discussion_categories_global ON global_discussion_categories(is_global) WHERE is_global = true;

-- --------------------------------------------------------------------------
-- 2. Global Discussions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  category_id UUID REFERENCES global_discussion_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_discussions_tenant ON global_discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_discussions_category_id ON global_discussions(category_id);
CREATE INDEX IF NOT EXISTS idx_global_discussions_author_id ON global_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_global_discussions_created_at ON global_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_discussions_last_activity ON global_discussions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_discussions_pinned_activity ON global_discussions(is_pinned DESC, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_discussions_search ON global_discussions USING GIN (to_tsvector('english', title || ' ' || content));

-- --------------------------------------------------------------------------
-- 3. Global Discussion Replies
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_discussion_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES global_discussion_replies(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_tenant ON global_discussion_replies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_discussion_id ON global_discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_author_id ON global_discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_parent_id ON global_discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_replies_created_at ON global_discussion_replies(created_at DESC);

-- --------------------------------------------------------------------------
-- 4. Global Discussion Votes
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_discussion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES global_discussion_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (discussion_id IS NOT NULL AND reply_id IS NULL) OR
    (discussion_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_tenant ON global_discussion_votes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_discussion_id ON global_discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_reply_id ON global_discussion_votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_votes_user_id ON global_discussion_votes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_discussion_votes_discussion_user ON global_discussion_votes(discussion_id, user_id) WHERE discussion_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_discussion_votes_reply_user ON global_discussion_votes(reply_id, user_id) WHERE reply_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 5. Global Discussion Subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_discussion_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  discussion_id UUID REFERENCES global_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notify_on_reply BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_global_discussion_subscriptions_tenant ON global_discussion_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_subscriptions_discussion ON global_discussion_subscriptions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_global_discussion_subscriptions_user ON global_discussion_subscriptions(user_id);


-- ############################################################################
-- PART B: ADVANCED ANALYTICS & OMNICHANNEL NOTIFICATIONS (14 tables)
-- ############################################################################

-- --------------------------------------------------------------------------
-- 6. Data Warehouse Configurations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_warehouse_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  warehouse_type VARCHAR NOT NULL CHECK (warehouse_type IN ('snowflake', 'bigquery', 'redshift', 'databricks', 'custom')),
  connection_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_frequency VARCHAR DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_data_warehouse_configs_tenant ON data_warehouse_configs(tenant_id);

-- --------------------------------------------------------------------------
-- 7. ETL Pipeline Jobs
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  warehouse_id UUID NOT NULL REFERENCES data_warehouse_configs(id) ON DELETE CASCADE,
  pipeline_name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_tenant ON etl_pipeline_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_warehouse_id ON etl_pipeline_jobs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_status ON etl_pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_started_at ON etl_pipeline_jobs(started_at);

-- --------------------------------------------------------------------------
-- 8. ETL Pipeline Schedules
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_pipeline_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  warehouse_id UUID NOT NULL REFERENCES data_warehouse_configs(id) ON DELETE CASCADE,
  pipeline_name VARCHAR NOT NULL,
  schedule_type VARCHAR NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'manual')),
  schedule_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etl_pipeline_schedules_tenant ON etl_pipeline_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_schedules_warehouse_id ON etl_pipeline_schedules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_schedules_next_run_at ON etl_pipeline_schedules(next_run_at);

-- --------------------------------------------------------------------------
-- 9. Student Risk Indicators (Predictive Analytics)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_risk_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score NUMERIC NOT NULL,
  risk_factors JSONB DEFAULT '[]',
  engagement_score NUMERIC,
  performance_score NUMERIC,
  attendance_rate NUMERIC,
  last_activity_at TIMESTAMPTZ,
  predicted_grade VARCHAR,
  confidence NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_tenant ON student_risk_indicators(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_student_id ON student_risk_indicators(student_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_course_id ON student_risk_indicators(course_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_risk_level ON student_risk_indicators(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_calculated_at ON student_risk_indicators(calculated_at);

-- --------------------------------------------------------------------------
-- 10. Learning Analytics Models
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_analytics_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  model_name VARCHAR NOT NULL,
  model_type VARCHAR NOT NULL CHECK (model_type IN ('risk_prediction', 'grade_prediction', 'engagement_forecast', 'dropout_prediction', 'custom')),
  model_version VARCHAR NOT NULL,
  model_config JSONB NOT NULL,
  training_data_range JSONB,
  accuracy_metrics JSONB,
  model_file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  trained_at TIMESTAMPTZ,
  trained_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_models_tenant ON learning_analytics_models(tenant_id);

-- --------------------------------------------------------------------------
-- 11. Learning Analytics Predictions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_analytics_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  model_id UUID NOT NULL REFERENCES learning_analytics_models(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  prediction_type VARCHAR NOT NULL,
  predicted_value JSONB NOT NULL,
  confidence NUMERIC,
  actual_value JSONB,
  features JSONB DEFAULT '{}',
  predicted_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_tenant ON learning_analytics_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_student_id ON learning_analytics_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_model_id ON learning_analytics_predictions(model_id);

-- --------------------------------------------------------------------------
-- 12. Engagement Metrics
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  metric_date DATE NOT NULL,
  login_count INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  assignments_submitted INTEGER DEFAULT 0,
  assignments_on_time INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  discussions_participated INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  engagement_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_tenant ON engagement_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_student_id ON engagement_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_course_id ON engagement_metrics(course_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_metric_date ON engagement_metrics(metric_date);

-- --------------------------------------------------------------------------
-- 13. Custom Report Executions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_report_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  result_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  result_data JSONB,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_report_executions_tenant ON custom_report_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_report_executions_report_id ON custom_report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_custom_report_executions_executed_by ON custom_report_executions(executed_by);

-- --------------------------------------------------------------------------
-- 14. Notification Channels
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  channel_type VARCHAR NOT NULL CHECK (channel_type IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  provider VARCHAR,
  api_key TEXT,
  api_secret TEXT,
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_tenant ON notification_channels(tenant_id);

-- --------------------------------------------------------------------------
-- 15. Omnichannel Notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS omnichannel_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  channels JSONB NOT NULL DEFAULT '[]',
  priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_notifications_tenant ON omnichannel_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_notifications_user_id ON omnichannel_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_notifications_sent_at ON omnichannel_notifications(sent_at);

-- --------------------------------------------------------------------------
-- 16. SMS Notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  notification_id UUID REFERENCES omnichannel_notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
  provider_message_id VARCHAR,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_tenant ON sms_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);

-- --------------------------------------------------------------------------
-- 17. WhatsApp Notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  notification_id UUID REFERENCES omnichannel_notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  message TEXT NOT NULL,
  template_name VARCHAR,
  template_params JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id VARCHAR,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_tenant ON whatsapp_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_user_id ON whatsapp_notifications(user_id);

-- --------------------------------------------------------------------------
-- 18. Push Notifications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  notification_id UUID REFERENCES omnichannel_notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT,
  platform VARCHAR CHECK (platform IN ('ios', 'android', 'web')),
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider_message_id VARCHAR,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_tenant ON push_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);

-- --------------------------------------------------------------------------
-- 19. Global Announcements
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  announcement_type VARCHAR DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'error', 'success', 'maintenance')),
  target_roles TEXT[] DEFAULT ARRAY[]::text[],
  target_tenants TEXT[] DEFAULT ARRAY[]::text[],
  target_courses UUID[],
  target_users UUID[],
  priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_dismissible BOOLEAN DEFAULT true,
  show_on_login BOOLEAN DEFAULT false,
  show_in_dashboard BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  send_notification BOOLEAN DEFAULT false,
  notification_channels TEXT[] DEFAULT ARRAY['in_app']::text[],
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_announcements_tenant ON global_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_announcements_is_active ON global_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_global_announcements_start_date ON global_announcements(start_date);
CREATE INDEX IF NOT EXISTS idx_global_announcements_end_date ON global_announcements(end_date);
