-- ============================================================================
-- Migration 009: CRM Tables + Programme Applications
-- ============================================================================
-- Depends on: 001 (tenants, users, courses), 008 (programmes)
--
-- Tables created in this migration:
--   CRM Phase 1: crm_student_lifecycle, crm_interactions
--   CRM Phase 2: crm_engagement_config, crm_engagement_scores
--   CRM Phase 3: crm_segments, crm_segment_members
--   CRM Phase 4: crm_campaigns, crm_campaign_recipients, crm_tasks
--   CRM Phase 5: crm_workflows, crm_workflow_executions
--   Programme Applications: programme_application_fields, programme_applications
--
-- NOTE: programmes, programme_courses, and programme_enrollments are already
--       created in 008-modules.sql and are NOT recreated here.
-- ============================================================================


-- ============================================================================
-- CRM Phase 1: Student Lifecycle & Interactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_student_lifecycle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage VARCHAR NOT NULL CHECK (stage IN ('prospect', 'onboarding', 'active', 'at_risk', 're_engagement', 'completing', 'alumni')),
  previous_stage VARCHAR,
  stage_changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_student_lifecycle_tenant ON crm_student_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_student_lifecycle_student_id ON crm_student_lifecycle(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_student_lifecycle_stage ON crm_student_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_crm_student_lifecycle_changed_at ON crm_student_lifecycle(stage_changed_at DESC);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR NOT NULL CHECK (interaction_type IN ('note', 'email', 'call', 'meeting', 'intervention', 'system')),
  subject VARCHAR NOT NULL,
  body TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  is_private BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_tenant ON crm_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_student_id ON crm_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by ON crm_interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON crm_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_course_id ON crm_interactions(course_id);


-- ============================================================================
-- CRM Phase 2: Engagement Scoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_engagement_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  config_name VARCHAR NOT NULL DEFAULT 'default',
  weights JSONB NOT NULL DEFAULT '{"login_frequency":0.15,"lesson_completion_rate":0.20,"quiz_performance":0.20,"assignment_submission_rate":0.20,"discussion_participation":0.10,"time_on_platform":0.15}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_engagement_config_tenant ON crm_engagement_config(tenant_id);

CREATE TABLE IF NOT EXISTS crm_engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  component_scores JSONB NOT NULL DEFAULT '{}',
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  config_id UUID REFERENCES crm_engagement_config(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, course_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_tenant ON crm_engagement_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_student_id ON crm_engagement_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_course_id ON crm_engagement_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_date ON crm_engagement_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_score ON crm_engagement_scores(score);


-- ============================================================================
-- CRM Phase 3: Segmentation
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL DEFAULT '[]',
  logic VARCHAR DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  is_dynamic BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_segments_tenant ON crm_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_segments_created_by ON crm_segments(created_by);

CREATE TABLE IF NOT EXISTS crm_segment_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_segment_members_tenant ON crm_segment_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_id ON crm_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_student_id ON crm_segment_members(student_id);


-- ============================================================================
-- CRM Phase 4: Campaigns, Recipients & Tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_variables JSONB DEFAULT '[]',
  segment_id UUID REFERENCES crm_segments(id) ON DELETE SET NULL,
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stats JSONB DEFAULT '{"total":0,"sent":0,"failed":0,"opened":0,"clicked":0}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_tenant ON crm_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_created_by ON crm_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_segment_id ON crm_campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_scheduled_for ON crm_campaigns(scheduled_for);

CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  application_token UUID DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_tenant ON crm_campaign_recipients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign_id ON crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_student_id ON crm_campaign_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_status ON crm_campaign_recipients(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_campaign_recipients_application_token ON crm_campaign_recipients(application_token);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR NOT NULL,
  description TEXT,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  source VARCHAR DEFAULT 'manual' CHECK (source IN ('manual', 'workflow', 'system')),
  source_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant ON crm_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_created_by ON crm_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_student_id ON crm_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);


-- ============================================================================
-- CRM Phase 5: Automation Workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  trigger_type VARCHAR NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'score_threshold')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflows_tenant ON crm_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by ON crm_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_is_active ON crm_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_trigger_type ON crm_workflows(trigger_type);

CREATE TABLE IF NOT EXISTS crm_workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger_data JSONB DEFAULT '{}',
  actions_executed JSONB DEFAULT '[]',
  status VARCHAR DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_tenant ON crm_workflow_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_workflow_id ON crm_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_student_id ON crm_workflow_executions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_executed_at ON crm_workflow_executions(executed_at DESC);


-- ============================================================================
-- Programme Application Fields (depends on crm_campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS programme_application_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'essay', 'multiple_choice', 'multiple_select', 'rating_scale')),
  question_text TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT true,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programme_application_fields_tenant ON programme_application_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_programme_application_fields_campaign_id ON programme_application_fields(campaign_id);


-- ============================================================================
-- Programme Applications (depends on crm_campaigns, programmes, crm_campaign_recipients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS programme_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES crm_campaign_recipients(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_email VARCHAR NOT NULL,
  applicant_name VARCHAR NOT NULL,
  answers JSONB DEFAULT '[]',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'withdrawn')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  enrollment_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_programme_applications_tenant ON programme_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_campaign_id ON programme_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_programme_id ON programme_applications(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_applicant_id ON programme_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_status ON programme_applications(status);
CREATE INDEX IF NOT EXISTS idx_programme_applications_recipient_id ON programme_applications(recipient_id);
