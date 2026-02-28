-- ============================================================================
-- Analytics, Data Warehousing, and Enhanced Notifications Schema
-- ============================================================================
-- This script creates tables for:
-- 1. Data Warehouse ETL pipelines
-- 2. Learning Analytics and Predictive Models
-- 3. Custom Report Builder
-- 4. Omnichannel Notifications (SMS, WhatsApp, Push)
-- 5. Global Announcements
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DATA WAREHOUSE & ETL TABLES
-- ============================================================================

-- Data Warehouse Configurations
-- Stores configuration for external data warehouses (Snowflake, BigQuery, etc.)
CREATE TABLE IF NOT EXISTS public.data_warehouse_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  warehouse_type character varying NOT NULL CHECK (warehouse_type IN ('snowflake', 'bigquery', 'redshift', 'databricks', 'custom')),
  connection_config jsonb NOT NULL, -- Encrypted connection details
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  sync_frequency character varying DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT data_warehouse_configs_pkey PRIMARY KEY (id)
);

-- ETL Pipeline Jobs
-- Tracks ETL pipeline execution
CREATE TABLE IF NOT EXISTS public.etl_pipeline_jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  warehouse_id uuid NOT NULL,
  pipeline_name character varying NOT NULL,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_seconds integer,
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT etl_pipeline_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT etl_pipeline_jobs_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.data_warehouse_configs(id) ON DELETE CASCADE
);

-- ETL Pipeline Schedules
-- Defines when ETL pipelines should run
CREATE TABLE IF NOT EXISTS public.etl_pipeline_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  warehouse_id uuid NOT NULL,
  pipeline_name character varying NOT NULL,
  schedule_type character varying NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'manual')),
  schedule_config jsonb NOT NULL, -- Cron expression or interval config
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT etl_pipeline_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT etl_pipeline_schedules_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.data_warehouse_configs(id) ON DELETE CASCADE
);

-- ============================================================================
-- LEARNING ANALYTICS TABLES
-- ============================================================================

-- Student Risk Indicators
-- Predictive analytics for at-risk students
CREATE TABLE IF NOT EXISTS public.student_risk_indicators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid,
  risk_level character varying NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score numeric NOT NULL, -- 0-100
  risk_factors jsonb DEFAULT '[]'::jsonb, -- Array of risk factors
  engagement_score numeric, -- 0-100
  performance_score numeric, -- 0-100
  attendance_rate numeric, -- 0-100
  last_activity_at timestamp with time zone,
  predicted_grade character varying,
  confidence numeric, -- 0-100
  calculated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT student_risk_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT student_risk_indicators_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT student_risk_indicators_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- Learning Analytics Models
-- Stores trained ML models and their configurations
CREATE TABLE IF NOT EXISTS public.learning_analytics_models (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  model_name character varying NOT NULL,
  model_type character varying NOT NULL CHECK (model_type IN ('risk_prediction', 'grade_prediction', 'engagement_forecast', 'dropout_prediction', 'custom')),
  model_version character varying NOT NULL,
  model_config jsonb NOT NULL, -- Model hyperparameters and configuration
  training_data_range jsonb, -- Date range of training data
  accuracy_metrics jsonb, -- Model performance metrics
  model_file_url text, -- URL to stored model file
  is_active boolean DEFAULT true,
  trained_at timestamp with time zone,
  trained_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT learning_analytics_models_pkey PRIMARY KEY (id),
  CONSTRAINT learning_analytics_models_trained_by_fkey FOREIGN KEY (trained_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Learning Analytics Predictions
-- Stores predictions made by ML models
CREATE TABLE IF NOT EXISTS public.learning_analytics_predictions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  model_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid,
  prediction_type character varying NOT NULL,
  predicted_value jsonb NOT NULL, -- Prediction output
  confidence numeric, -- 0-100
  actual_value jsonb, -- Actual outcome (for validation)
  features jsonb DEFAULT '{}'::jsonb, -- Input features used
  predicted_at timestamp with time zone DEFAULT now(),
  validated_at timestamp with time zone,
  CONSTRAINT learning_analytics_predictions_pkey PRIMARY KEY (id),
  CONSTRAINT learning_analytics_predictions_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.learning_analytics_models(id) ON DELETE CASCADE,
  CONSTRAINT learning_analytics_predictions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT learning_analytics_predictions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- Engagement Metrics
-- Tracks student engagement over time
CREATE TABLE IF NOT EXISTS public.engagement_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid,
  metric_date date NOT NULL,
  login_count integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  assignments_submitted integer DEFAULT 0,
  assignments_on_time integer DEFAULT 0,
  quizzes_completed integer DEFAULT 0,
  discussions_participated integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  videos_watched integer DEFAULT 0,
  engagement_score numeric, -- Calculated composite score
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT engagement_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT engagement_metrics_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT engagement_metrics_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL,
  CONSTRAINT engagement_metrics_unique UNIQUE (student_id, course_id, metric_date)
);

-- ============================================================================
-- CUSTOM REPORT BUILDER TABLES
-- ============================================================================

-- Custom Reports
-- User-created custom reports
CREATE TABLE IF NOT EXISTS public.custom_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  created_by uuid NOT NULL,
  report_type character varying NOT NULL CHECK (report_type IN ('student', 'course', 'enrollment', 'grade', 'engagement', 'custom')),
  
  -- Report configuration
  data_source character varying DEFAULT 'database' CHECK (data_source IN ('database', 'warehouse', 'api')),
  base_table character varying, -- Base table/view to query
  columns jsonb NOT NULL DEFAULT '[]'::jsonb, -- Selected columns
  filters jsonb DEFAULT '[]'::jsonb, -- Filter conditions
  group_by jsonb DEFAULT '[]'::jsonb, -- Grouping columns
  order_by jsonb DEFAULT '[]'::jsonb, -- Sorting configuration
  limit_count integer,
  
  -- Display configuration
  chart_type character varying CHECK (chart_type IN ('table', 'bar', 'line', 'pie', 'scatter', 'area')),
  chart_config jsonb DEFAULT '{}'::jsonb,
  
  -- Access control
  is_shared boolean DEFAULT false,
  shared_with_roles text[] DEFAULT ARRAY[]::text[],
  
  -- Metadata
  last_run_at timestamp with time zone,
  run_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT custom_reports_pkey PRIMARY KEY (id),
  CONSTRAINT custom_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Custom Report Executions
-- Logs of report executions
CREATE TABLE IF NOT EXISTS public.custom_report_executions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  report_id uuid NOT NULL,
  executed_by uuid NOT NULL,
  status character varying DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  result_count integer,
  execution_time_ms integer,
  error_message text,
  result_data jsonb, -- Cached result data
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_report_executions_pkey PRIMARY KEY (id),
  CONSTRAINT custom_report_executions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.custom_reports(id) ON DELETE CASCADE,
  CONSTRAINT custom_report_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- OMNICHANNEL NOTIFICATIONS TABLES
-- ============================================================================

-- Notification Channels
-- Configuration for different notification channels
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  channel_type character varying NOT NULL UNIQUE CHECK (channel_type IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  provider character varying, -- 'twilio', 'vonage', 'firebase', 'resend', etc.
  api_key text, -- Encrypted
  api_secret text, -- Encrypted
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  rate_limit_per_minute integer DEFAULT 60,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_channels_pkey PRIMARY KEY (id)
);

-- Omnichannel Notifications
-- Unified notification log across all channels
CREATE TABLE IF NOT EXISTS public.omnichannel_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  notification_type character varying NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  link_url text,
  
  -- Channel delivery status
  channels jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of {channel, status, sent_at, error}
  
  -- Targeting
  priority character varying DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for timestamp with time zone,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  
  CONSTRAINT omnichannel_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT omnichannel_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- SMS Notifications
-- SMS-specific notification log
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notification_id uuid, -- Link to omnichannel_notifications
  user_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  message text NOT NULL,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
  provider_message_id character varying,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  error_message text,
  cost numeric, -- Cost in currency
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sms_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT sms_notifications_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.omnichannel_notifications(id) ON DELETE SET NULL,
  CONSTRAINT sms_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- WhatsApp Notifications
-- WhatsApp-specific notification log
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notification_id uuid,
  user_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  message text NOT NULL,
  template_name character varying, -- WhatsApp template name
  template_params jsonb DEFAULT '{}'::jsonb,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id character varying,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_notifications_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.omnichannel_notifications(id) ON DELETE SET NULL,
  CONSTRAINT whatsapp_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Push Notifications
-- Push notification log (mobile/web)
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notification_id uuid,
  user_id uuid NOT NULL,
  device_token text,
  platform character varying CHECK (platform IN ('ios', 'android', 'web')),
  title character varying NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb, -- Additional payload data
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider_message_id character varying,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT push_notifications_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.omnichannel_notifications(id) ON DELETE SET NULL,
  CONSTRAINT push_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- User Notification Preferences (Enhanced)
-- Extends existing notification_preferences with omnichannel settings
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS phone_number character varying;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_number character varying;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS push_tokens jsonb DEFAULT '[]'::jsonb;

-- ============================================================================
-- GLOBAL ANNOUNCEMENTS TABLES
-- ============================================================================

-- Global Announcements
-- System-wide announcements and alerts
CREATE TABLE IF NOT EXISTS public.global_announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  message text NOT NULL,
  announcement_type character varying DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'error', 'success', 'maintenance')),
  
  -- Targeting
  target_roles text[] DEFAULT ARRAY[]::text[], -- Empty = all roles
  target_tenants text[] DEFAULT ARRAY[]::text[], -- For multi-tenant (empty = all)
  target_courses uuid[], -- Specific courses (empty = all)
  target_users uuid[], -- Specific users (empty = all)
  
  -- Display settings
  priority character varying DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_dismissible boolean DEFAULT true,
  show_on_login boolean DEFAULT false,
  show_in_dashboard boolean DEFAULT true,
  
  -- Scheduling
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  
  -- Delivery
  send_notification boolean DEFAULT false,
  notification_channels text[] DEFAULT ARRAY['in_app']::text[],
  
  -- Metadata
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT global_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT global_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Announcement Views
-- Tracks which users have seen/dismissed announcements
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  dismissed_at timestamp with time zone,
  CONSTRAINT announcement_views_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_views_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.global_announcements(id) ON DELETE CASCADE,
  CONSTRAINT announcement_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT announcement_views_unique UNIQUE (announcement_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- ETL Indexes
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_warehouse_id ON public.etl_pipeline_jobs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_status ON public.etl_pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_jobs_started_at ON public.etl_pipeline_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_schedules_warehouse_id ON public.etl_pipeline_schedules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_etl_pipeline_schedules_next_run_at ON public.etl_pipeline_schedules(next_run_at);

-- Learning Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_student_id ON public.student_risk_indicators(student_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_course_id ON public.student_risk_indicators(course_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_risk_level ON public.student_risk_indicators(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_risk_indicators_calculated_at ON public.student_risk_indicators(calculated_at);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_student_id ON public.engagement_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_course_id ON public.engagement_metrics(course_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_metric_date ON public.engagement_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_student_id ON public.learning_analytics_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_predictions_model_id ON public.learning_analytics_predictions(model_id);

-- Report Builder Indexes
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON public.custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_report_type ON public.custom_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_custom_report_executions_report_id ON public.custom_report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_custom_report_executions_executed_by ON public.custom_report_executions(executed_by);

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_omnichannel_notifications_user_id ON public.omnichannel_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_notifications_sent_at ON public.omnichannel_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON public.sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON public.sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_user_id ON public.whatsapp_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON public.push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications(status);

-- Announcement Indexes
CREATE INDEX IF NOT EXISTS idx_global_announcements_is_active ON public.global_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_global_announcements_start_date ON public.global_announcements(start_date);
CREATE INDEX IF NOT EXISTS idx_global_announcements_end_date ON public.global_announcements(end_date);
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement_id ON public.announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user_id ON public.announcement_views(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables (idempotent - safe to run multiple times)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'data_warehouse_configs' AND schemaname = 'public') THEN
    ALTER TABLE public.data_warehouse_configs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- For existing tables, just enable RLS (won't error if already enabled)
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS public.etl_pipeline_jobs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.etl_pipeline_schedules ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.student_risk_indicators ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.learning_analytics_models ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.learning_analytics_predictions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.engagement_metrics ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.custom_reports ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.custom_report_executions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.notification_channels ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.omnichannel_notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.sms_notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.whatsapp_notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.push_notifications ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.global_announcements ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.announcement_views ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if RLS is already enabled
  NULL;
END $$;

-- Data Warehouse: Admin only
DROP POLICY IF EXISTS data_warehouse_admin_access ON public.data_warehouse_configs;
CREATE POLICY data_warehouse_admin_access ON public.data_warehouse_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Student Risk Indicators: Students can view their own, instructors can view their students
DROP POLICY IF EXISTS student_risk_indicators_access ON public.student_risk_indicators;
CREATE POLICY student_risk_indicators_access ON public.student_risk_indicators
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = student_risk_indicators.course_id
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
      )
    )
  );

-- Custom Reports: Users can view their own and shared reports
DROP POLICY IF EXISTS custom_reports_access ON public.custom_reports;
CREATE POLICY custom_reports_access ON public.custom_reports
  FOR SELECT USING (
    created_by = auth.uid() OR
    is_shared = true OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = ANY(shared_with_roles) OR users.role IN ('admin', 'super_admin'))
    )
  );

DROP POLICY IF EXISTS custom_reports_write ON public.custom_reports;
CREATE POLICY custom_reports_write ON public.custom_reports
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Omnichannel Notifications: Users can view their own
DROP POLICY IF EXISTS omnichannel_notifications_access ON public.omnichannel_notifications;
CREATE POLICY omnichannel_notifications_access ON public.omnichannel_notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- SMS Notifications: Users can view their own
DROP POLICY IF EXISTS sms_notifications_access ON public.sms_notifications;
CREATE POLICY sms_notifications_access ON public.sms_notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- WhatsApp Notifications: Users can view their own
DROP POLICY IF EXISTS whatsapp_notifications_access ON public.whatsapp_notifications;
CREATE POLICY whatsapp_notifications_access ON public.whatsapp_notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Push Notifications: Users can view their own
DROP POLICY IF EXISTS push_notifications_access ON public.push_notifications;
CREATE POLICY push_notifications_access ON public.push_notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Notification Channels: Admin only
DROP POLICY IF EXISTS notification_channels_admin_access ON public.notification_channels;
CREATE POLICY notification_channels_admin_access ON public.notification_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Global Announcements: All authenticated users can view active announcements
DROP POLICY IF EXISTS global_announcements_access ON public.global_announcements;
CREATE POLICY global_announcements_access ON public.global_announcements
  FOR SELECT USING (
    is_active = true AND
    (start_date IS NULL OR start_date <= now()) AND
    (end_date IS NULL OR end_date >= now()) AND
    (
      array_length(target_roles, 1) IS NULL OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = ANY(target_roles)
      )
    )
  );

DROP POLICY IF EXISTS global_announcements_admin_write ON public.global_announcements;
CREATE POLICY global_announcements_admin_write ON public.global_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_data_warehouse_configs_updated_at ON public.data_warehouse_configs;
CREATE TRIGGER update_data_warehouse_configs_updated_at BEFORE UPDATE ON public.data_warehouse_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_etl_pipeline_schedules_updated_at ON public.etl_pipeline_schedules;
CREATE TRIGGER update_etl_pipeline_schedules_updated_at BEFORE UPDATE ON public.etl_pipeline_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_analytics_models_updated_at ON public.learning_analytics_models;
CREATE TRIGGER update_learning_analytics_models_updated_at BEFORE UPDATE ON public.learning_analytics_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_reports_updated_at ON public.custom_reports;
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON public.custom_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON public.notification_channels;
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON public.notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_announcements_updated_at ON public.global_announcements;
CREATE TRIGGER update_global_announcements_updated_at BEFORE UPDATE ON public.global_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_student_id uuid,
  p_course_id uuid,
  p_date date
) RETURNS numeric AS $$
DECLARE
  v_score numeric := 0;
  v_login_weight numeric := 0.1;
  v_time_weight numeric := 0.2;
  v_assignment_weight numeric := 0.3;
  v_quiz_weight numeric := 0.2;
  v_discussion_weight numeric := 0.1;
  v_lesson_weight numeric := 0.1;
BEGIN
  -- This is a simplified calculation
  -- In production, you'd use actual metrics from engagement_metrics table
  SELECT 
    COALESCE(
      (login_count * v_login_weight) +
      (LEAST(time_spent_minutes / 60.0, 1) * 100 * v_time_weight) +
      (LEAST(assignments_submitted / 10.0, 1) * 100 * v_assignment_weight) +
      (LEAST(quizzes_completed / 5.0, 1) * 100 * v_quiz_weight) +
      (LEAST(discussions_participated / 3.0, 1) * 100 * v_discussion_weight) +
      (LEAST(lessons_completed / 20.0, 1) * 100 * v_lesson_weight),
      0
    )
  INTO v_score
  FROM engagement_metrics
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND metric_date = p_date;
  
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

