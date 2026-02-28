-- ============================================================================
-- Part 6: Notifications, Email, Analytics, AI Conversations
-- ============================================================================
-- Depends on: 001
-- Note: Tables referencing auth.users(id) use that FK for Supabase auth
-- ============================================================================

-- ============================================================================
-- IN-APP NOTIFICATIONS
-- ============================================================================

CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_in_app_notifications_tenant ON in_app_notifications(tenant_id);
CREATE INDEX idx_in_app_notifications_user ON in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_read ON in_app_notifications(user_id, is_read);

-- ============================================================================
-- AI CONTEXT CACHE
-- ============================================================================

CREATE TABLE public.ai_context_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  context_key VARCHAR NOT NULL,
  context_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_context_cache_pkey PRIMARY KEY (id),
  UNIQUE(user_id, context_key)
);

CREATE INDEX idx_ai_context_cache_tenant ON ai_context_cache(tenant_id);
CREATE INDEX idx_ai_context_cache_user_key ON ai_context_cache(user_id, context_key);
CREATE INDEX idx_ai_context_cache_expires ON ai_context_cache(expires_at);

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_tenant ON ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);

-- ============================================================================
-- AI MESSAGES
-- ============================================================================

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_tenant ON ai_messages(tenant_id);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at DESC);

-- ============================================================================
-- AI USAGE TRACKING
-- ============================================================================

CREATE TABLE public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0.00,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_ai_usage_tracking_tenant ON ai_usage_tracking(tenant_id);
CREATE INDEX idx_ai_usage_tracking_user_date ON ai_usage_tracking(user_id, date);

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  phone_number VARCHAR,
  whatsapp_number VARCHAR,
  push_tokens JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{"grade_posted": {"email": true, "in_app": true}, "discussion_reply": {"email": true, "in_app": true}, "course_enrollment": {"email": true, "in_app": true}, "discussion_mention": {"email": true, "in_app": true}, "course_announcement": {"email": true, "in_app": true}, "assignment_due_reminder": {"email": true, "in_app": true, "days_before": 1}, "enrollment_confirmation": {"email": true, "in_app": true}}'::jsonb,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  digest_frequency VARCHAR DEFAULT 'daily' CHECK (digest_frequency IN ('none', 'daily', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_notification_preferences_tenant ON notification_preferences(tenant_id);

-- ============================================================================
-- EMAIL NOTIFICATIONS
-- ============================================================================

CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  body_text TEXT,
  body_html TEXT,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_notifications_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_email_notifications_tenant ON email_notifications(tenant_id);
CREATE INDEX idx_email_notifications_user ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);

-- ============================================================================
-- EMAIL DIGESTS
-- ============================================================================

CREATE TABLE public.email_digests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  digest_type VARCHAR NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  notification_ids UUID[] DEFAULT '{}'::uuid[],
  subject VARCHAR NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_digests_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_email_digests_tenant ON email_digests(tenant_id);
CREATE INDEX idx_email_digests_user ON email_digests(user_id);

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL UNIQUE,
  type VARCHAR NOT NULL,
  subject_template TEXT NOT NULL,
  body_html_template TEXT NOT NULL,
  body_text_template TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);

-- ============================================================================
-- STUDENT ACTIVITY LOG
-- ============================================================================

CREATE TABLE public.student_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  activity_type TEXT NOT NULL,
  item_id UUID,
  item_type TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_activity_log_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_student_activity_log_tenant ON student_activity_log(tenant_id);
CREATE INDEX idx_student_activity_log_student ON student_activity_log(student_id);
CREATE INDEX idx_student_activity_log_course ON student_activity_log(course_id);

-- ============================================================================
-- ANALYTICS DASHBOARDS
-- ============================================================================

CREATE TABLE public.analytics_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_dashboards_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_analytics_dashboards_tenant ON analytics_dashboards(tenant_id);
CREATE INDEX idx_analytics_dashboards_user ON analytics_dashboards(user_id);

-- ============================================================================
-- ANALYTICS REPORTS
-- ============================================================================

CREATE TABLE public.analytics_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  config JSONB NOT NULL,
  schedule JSONB,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_reports_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_analytics_reports_tenant ON analytics_reports(tenant_id);
CREATE INDEX idx_analytics_reports_created_by ON analytics_reports(created_by);

-- ============================================================================
-- ANALYTICS METRICS
-- ============================================================================

CREATE TABLE public.analytics_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  metric_value JSONB NOT NULL,
  dimensions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_metrics_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_analytics_metrics_tenant ON analytics_metrics(tenant_id);
CREATE INDEX idx_analytics_metrics_type_date ON analytics_metrics(metric_type, metric_date);

-- ============================================================================
-- STUDENT RISK SCORES
-- ============================================================================

CREATE TABLE public.student_risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, calculated_at)
);

CREATE INDEX idx_student_risk_scores_tenant ON student_risk_scores(tenant_id);
CREATE INDEX idx_student_risk_scores_student ON student_risk_scores(student_id);
CREATE INDEX idx_student_risk_scores_course ON student_risk_scores(course_id);
CREATE INDEX idx_student_risk_scores_risk_level ON student_risk_scores(risk_level);

-- ============================================================================
-- CUSTOM REPORTS (analytics)
-- ============================================================================

CREATE TABLE public.custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_reports_tenant ON custom_reports(tenant_id);
CREATE INDEX idx_custom_reports_user ON custom_reports(user_id);

-- ============================================================================
-- REPORT SCHEDULES
-- ============================================================================

CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_tenant ON report_schedules(tenant_id);
CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run) WHERE is_active = true;

-- ============================================================================
-- AI INSIGHTS
-- ============================================================================

CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  insight_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  insight TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_actionable BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(insight_type, entity_type, entity_id, created_at)
);

CREATE INDEX idx_ai_insights_tenant ON ai_insights(tenant_id);
CREATE INDEX idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_unread ON ai_insights(is_read) WHERE is_read = false;
