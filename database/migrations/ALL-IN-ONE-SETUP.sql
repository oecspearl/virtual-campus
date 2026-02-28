-- ============================================================================
-- ALL-IN-ONE DATABASE SETUP
-- ============================================================================
-- CRM Phase 1-5 + Programmes + Applications + AI Assistant
-- Run this ONCE in the CORRECT Supabase SQL Editor.
-- All statements are idempotent (safe to re-run).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CRM PHASE 1: Student Lifecycle & Interactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_student_lifecycle (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  stage character varying NOT NULL CHECK (stage IN (
    'prospect', 'onboarding', 'active', 'at_risk',
    're_engagement', 'completing', 'alumni'
  )),
  previous_stage character varying,
  stage_changed_at timestamp with time zone DEFAULT now(),
  changed_by uuid,
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_student_lifecycle_pkey PRIMARY KEY (id),
  CONSTRAINT crm_student_lifecycle_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_student_lifecycle_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  interaction_type character varying NOT NULL CHECK (interaction_type IN (
    'note', 'email', 'call', 'meeting', 'intervention', 'system'
  )),
  subject character varying NOT NULL,
  body text,
  course_id uuid,
  is_private boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT crm_interactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_interactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_interactions_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- ============================================================================
-- CRM PHASE 2: Engagement Scoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_engagement_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  config_name character varying NOT NULL DEFAULT 'default',
  weights jsonb NOT NULL DEFAULT '{"login_frequency":0.15,"lesson_completion_rate":0.20,"quiz_performance":0.20,"assignment_submission_rate":0.20,"discussion_participation":0.10,"time_on_platform":0.15}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_engagement_config_pkey PRIMARY KEY (id),
  CONSTRAINT crm_engagement_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_engagement_scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  component_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  config_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_engagement_scores_pkey PRIMARY KEY (id),
  CONSTRAINT crm_engagement_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_engagement_scores_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT crm_engagement_scores_config_id_fkey FOREIGN KEY (config_id) REFERENCES crm_engagement_config(id) ON DELETE SET NULL,
  CONSTRAINT crm_engagement_scores_unique UNIQUE (student_id, course_id, score_date)
);

-- ============================================================================
-- CRM PHASE 3: Segmentation
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_segments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  created_by uuid NOT NULL,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  logic character varying DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
  member_count integer DEFAULT 0,
  last_calculated_at timestamp with time zone,
  is_dynamic boolean DEFAULT true,
  is_shared boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_segments_pkey PRIMARY KEY (id),
  CONSTRAINT crm_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_segment_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  segment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_segment_members_pkey PRIMARY KEY (id),
  CONSTRAINT crm_segment_members_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES crm_segments(id) ON DELETE CASCADE,
  CONSTRAINT crm_segment_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_segment_members_unique UNIQUE (segment_id, student_id)
);

-- ============================================================================
-- CRM PHASE 4: Campaigns, Recipients & Tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  subject character varying NOT NULL,
  body_html text NOT NULL,
  body_text text,
  template_variables jsonb DEFAULT '[]'::jsonb,
  segment_id uuid,
  status character varying DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid NOT NULL,
  stats jsonb DEFAULT '{"total":0,"sent":0,"failed":0,"opened":0,"clicked":0}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT crm_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_campaigns_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES crm_segments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL,
  student_id uuid NOT NULL,
  email character varying NOT NULL,
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT crm_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT crm_campaign_recipients_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  student_id uuid,
  course_id uuid,
  assigned_to uuid NOT NULL,
  created_by uuid NOT NULL,
  priority character varying DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  source character varying DEFAULT 'manual' CHECK (source IN ('manual', 'workflow', 'system')),
  source_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT crm_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT crm_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT crm_tasks_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- ============================================================================
-- CRM PHASE 5: Automation Workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_workflows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  created_by uuid NOT NULL,
  is_active boolean DEFAULT false,
  trigger_type character varying NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'score_threshold')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  execution_count integer DEFAULT 0,
  last_executed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_workflows_pkey PRIMARY KEY (id),
  CONSTRAINT crm_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_workflow_executions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workflow_id uuid NOT NULL,
  student_id uuid,
  trigger_data jsonb DEFAULT '{}'::jsonb,
  actions_executed jsonb DEFAULT '[]'::jsonb,
  status character varying DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_workflow_executions_pkey PRIMARY KEY (id),
  CONSTRAINT crm_workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES crm_workflows(id) ON DELETE CASCADE,
  CONSTRAINT crm_workflow_executions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- PROGRAMMES
-- ============================================================================

CREATE TABLE IF NOT EXISTS programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  thumbnail VARCHAR(500),
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration VARCHAR(100),
  passing_score DECIMAL(5,2) DEFAULT 70.00,
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programme_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) DEFAULT 1.00,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(programme_id, course_id)
);

CREATE TABLE IF NOT EXISTS programme_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  final_score DECIMAL(5,2),
  certificate_issued BOOLEAN DEFAULT false,
  UNIQUE(programme_id, student_id)
);

ALTER TABLE programme_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- PROGRAMME APPLICATION CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS programme_application_fields (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'essay', 'multiple_choice', 'multiple_select', 'rating_scale')),
  question_text TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT true,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT programme_application_fields_pkey PRIMARY KEY (id),
  CONSTRAINT programme_application_fields_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS programme_applications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL,
  programme_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  applicant_email VARCHAR NOT NULL,
  applicant_name VARCHAR NOT NULL,
  answers JSONB DEFAULT '[]',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'withdrawn')),
  reviewed_by UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrollment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT programme_applications_pkey PRIMARY KEY (id),
  CONSTRAINT programme_applications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_programme_id_fkey FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES crm_campaign_recipients(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT programme_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT programme_applications_unique_recipient UNIQUE (campaign_id, recipient_id)
);

-- Application token on campaign recipients
ALTER TABLE crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS application_token UUID DEFAULT uuid_generate_v4();

-- ============================================================================
-- AI ASSISTANT
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0.00,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS ai_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_key VARCHAR(255) NOT NULL,
  context_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, context_key)
);

-- ============================================================================
-- ALL INDEXES
-- ============================================================================

-- CRM Phase 1
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_student_id ON crm_student_lifecycle(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_stage ON crm_student_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_changed_at ON crm_student_lifecycle(stage_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_student_id ON crm_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by ON crm_interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON crm_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_course_id ON crm_interactions(course_id);

-- CRM Phase 2
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_student_id ON crm_engagement_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_course_id ON crm_engagement_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_date ON crm_engagement_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_score ON crm_engagement_scores(score);

-- CRM Phase 3
CREATE INDEX IF NOT EXISTS idx_crm_segments_created_by ON crm_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_id ON crm_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_student_id ON crm_segment_members(student_id);

-- CRM Phase 4
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_created_by ON crm_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_segment_id ON crm_campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_scheduled_for ON crm_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign_id ON crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_student_id ON crm_campaign_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_status ON crm_campaign_recipients(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_campaign_recipients_application_token ON crm_campaign_recipients(application_token);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_created_by ON crm_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_student_id ON crm_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);

-- CRM Phase 5
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by ON crm_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_is_active ON crm_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_trigger_type ON crm_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_workflow_id ON crm_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_student_id ON crm_workflow_executions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_executed_at ON crm_workflow_executions(executed_at DESC);

-- Programmes
CREATE INDEX IF NOT EXISTS idx_programmes_slug ON programmes(slug);
CREATE INDEX IF NOT EXISTS idx_programmes_published ON programmes(published);
CREATE INDEX IF NOT EXISTS idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_courses_course ON programme_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_programme ON programme_enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_student ON programme_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_status ON programme_enrollments(status);

-- Applications
CREATE INDEX IF NOT EXISTS idx_programme_application_fields_campaign_id ON programme_application_fields(campaign_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_campaign_id ON programme_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_programme_id ON programme_applications(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_applicant_id ON programme_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_status ON programme_applications(status);
CREATE INDEX IF NOT EXISTS idx_programme_applications_recipient_id ON programme_applications(recipient_id);

-- AI Assistant
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_date ON ai_usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_user_key ON ai_context_cache(user_id, context_key);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_expires ON ai_context_cache(expires_at);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE crm_student_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_engagement_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- CRM Lifecycle
DROP POLICY IF EXISTS crm_lifecycle_staff_access ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_staff_access ON crm_student_lifecycle
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_lifecycle_student_read ON crm_student_lifecycle;
CREATE POLICY crm_lifecycle_student_read ON crm_student_lifecycle
  FOR SELECT USING (student_id = auth.uid());

-- CRM Interactions
DROP POLICY IF EXISTS crm_interactions_staff_access ON crm_interactions;
CREATE POLICY crm_interactions_staff_access ON crm_interactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_interactions_student_read ON crm_interactions;
CREATE POLICY crm_interactions_student_read ON crm_interactions
  FOR SELECT USING (student_id = auth.uid() AND is_private = false);

-- Engagement
DROP POLICY IF EXISTS crm_engagement_config_admin ON crm_engagement_config;
CREATE POLICY crm_engagement_config_admin ON crm_engagement_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_engagement_scores_staff_read ON crm_engagement_scores;
CREATE POLICY crm_engagement_scores_staff_read ON crm_engagement_scores
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Segments
DROP POLICY IF EXISTS crm_segments_staff_access ON crm_segments;
CREATE POLICY crm_segments_staff_access ON crm_segments
  FOR ALL USING (
    created_by = auth.uid() OR is_shared = true OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_segment_members_staff_read ON crm_segment_members;
CREATE POLICY crm_segment_members_staff_read ON crm_segment_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Campaigns
DROP POLICY IF EXISTS crm_campaigns_staff_access ON crm_campaigns;
CREATE POLICY crm_campaigns_staff_access ON crm_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_campaign_recipients_staff_read ON crm_campaign_recipients;
CREATE POLICY crm_campaign_recipients_staff_read ON crm_campaign_recipients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Tasks
DROP POLICY IF EXISTS crm_tasks_access ON crm_tasks;
CREATE POLICY crm_tasks_access ON crm_tasks
  FOR ALL USING (
    assigned_to = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Workflows
DROP POLICY IF EXISTS crm_workflows_admin_access ON crm_workflows;
CREATE POLICY crm_workflows_admin_access ON crm_workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_workflow_executions_admin_read ON crm_workflow_executions;
CREATE POLICY crm_workflow_executions_admin_read ON crm_workflow_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Programmes
DROP POLICY IF EXISTS "Published programmes are viewable by everyone" ON programmes;
CREATE POLICY "Published programmes are viewable by everyone" ON programmes
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Staff can view all programmes" ON programmes;
CREATE POLICY "Staff can view all programmes" ON programmes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Staff can manage programmes" ON programmes;
CREATE POLICY "Staff can manage programmes" ON programmes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Programme courses viewable with programme" ON programme_courses;
CREATE POLICY "Programme courses viewable with programme" ON programme_courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM programmes WHERE programmes.id = programme_courses.programme_id AND programmes.published = true)
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
               AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Staff can manage programme courses" ON programme_courses;
CREATE POLICY "Staff can manage programme courses" ON programme_courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
  );

DROP POLICY IF EXISTS "Students can view own enrollments" ON programme_enrollments;
CREATE POLICY "Students can view own enrollments" ON programme_enrollments
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all enrollments" ON programme_enrollments;
CREATE POLICY "Staff can view all enrollments" ON programme_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Students can enroll themselves" ON programme_enrollments;
CREATE POLICY "Students can enroll themselves" ON programme_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage enrollments" ON programme_enrollments;
CREATE POLICY "Staff can manage enrollments" ON programme_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

-- Application fields
DROP POLICY IF EXISTS programme_application_fields_staff_all ON programme_application_fields;
CREATE POLICY programme_application_fields_staff_all ON programme_application_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_application_fields_anon_select ON programme_application_fields;
CREATE POLICY programme_application_fields_anon_select ON programme_application_fields
  FOR SELECT USING (true);

-- Applications
DROP POLICY IF EXISTS programme_applications_staff_all ON programme_applications;
CREATE POLICY programme_applications_staff_all ON programme_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS programme_applications_student_select ON programme_applications;
CREATE POLICY programme_applications_student_select ON programme_applications
  FOR SELECT USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS programme_applications_student_insert ON programme_applications;
CREATE POLICY programme_applications_student_insert ON programme_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- AI Conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
CREATE POLICY "Users can view their own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON ai_conversations;
CREATE POLICY "Users can insert their own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON ai_conversations;
CREATE POLICY "Users can update their own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON ai_conversations;
CREATE POLICY "Users can delete their own conversations" ON ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- AI Messages
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON ai_messages;
CREATE POLICY "Users can view messages from their conversations" ON ai_messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON ai_messages;
CREATE POLICY "Users can insert messages to their conversations" ON ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update messages from their conversations" ON ai_messages;
CREATE POLICY "Users can update messages from their conversations" ON ai_messages
  FOR UPDATE USING (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON ai_messages;
CREATE POLICY "Users can delete messages from their conversations" ON ai_messages
  FOR DELETE USING (
    conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid())
  );

-- AI Usage Tracking
DROP POLICY IF EXISTS "Users can view their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can view their own usage tracking" ON ai_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can insert their own usage tracking" ON ai_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage tracking" ON ai_usage_tracking;
CREATE POLICY "Users can update their own usage tracking" ON ai_usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Context Cache
DROP POLICY IF EXISTS "Users can view their own context cache" ON ai_context_cache;
CREATE POLICY "Users can view their own context cache" ON ai_context_cache
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own context cache" ON ai_context_cache;
CREATE POLICY "Users can insert their own context cache" ON ai_context_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own context cache" ON ai_context_cache;
CREATE POLICY "Users can update their own context cache" ON ai_context_cache
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own context cache" ON ai_context_cache;
CREATE POLICY "Users can delete their own context cache" ON ai_context_cache
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- CRM tables
GRANT ALL ON crm_student_lifecycle TO service_role;
GRANT ALL ON crm_interactions TO service_role;
GRANT ALL ON crm_engagement_config TO service_role;
GRANT ALL ON crm_engagement_scores TO service_role;
GRANT ALL ON crm_segments TO service_role;
GRANT ALL ON crm_segment_members TO service_role;
GRANT ALL ON crm_campaigns TO service_role;
GRANT ALL ON crm_campaign_recipients TO service_role;
GRANT ALL ON crm_tasks TO service_role;
GRANT ALL ON crm_workflows TO service_role;
GRANT ALL ON crm_workflow_executions TO service_role;

-- Programme tables
GRANT SELECT ON programmes TO authenticated;
GRANT SELECT ON programme_courses TO authenticated;
GRANT SELECT, INSERT ON programme_enrollments TO authenticated;
GRANT ALL ON programmes TO service_role;
GRANT ALL ON programme_courses TO service_role;
GRANT ALL ON programme_enrollments TO service_role;

-- Application tables
GRANT SELECT ON programme_application_fields TO authenticated;
GRANT SELECT, INSERT ON programme_applications TO authenticated;
GRANT SELECT ON programme_application_fields TO anon;
GRANT ALL ON programme_application_fields TO service_role;
GRANT ALL ON programme_applications TO service_role;

-- AI tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON ai_messages TO authenticated;
GRANT ALL ON ai_usage_tracking TO authenticated;
GRANT ALL ON ai_context_cache TO authenticated;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Default engagement config
INSERT INTO crm_engagement_config (config_name, is_active)
VALUES ('default', true)
ON CONFLICT DO NOTHING;

-- Auto-enroll trigger: when student enrolls in programme, enroll in all courses
CREATE OR REPLACE FUNCTION auto_enroll_programme_courses()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO enrollments (student_id, course_id, status)
  SELECT NEW.student_id, pc.course_id, 'active'
  FROM programme_courses pc
  WHERE pc.programme_id = NEW.programme_id
  AND NOT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.student_id = NEW.student_id AND e.course_id = pc.course_id
  )
  ON CONFLICT (student_id, course_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_enroll_programme_courses ON programme_enrollments;
CREATE TRIGGER trg_auto_enroll_programme_courses
  AFTER INSERT ON programme_enrollments
  FOR EACH ROW EXECUTE FUNCTION auto_enroll_programme_courses();

-- AI usage functions
CREATE OR REPLACE FUNCTION get_user_ai_usage_today(user_uuid UUID)
RETURNS TABLE(api_calls INTEGER, tokens_used INTEGER, cost_usd DECIMAL(10, 4)) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ut.api_calls, 0) as api_calls,
    COALESCE(ut.tokens_used, 0) as tokens_used,
    COALESCE(ut.cost_usd, 0.00) as cost_usd
  FROM ai_usage_tracking ut
  WHERE ut.user_id = user_uuid
    AND ut.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_ai_context()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_context_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_ai_usage(
  user_uuid UUID,
  additional_calls INTEGER DEFAULT 1,
  additional_tokens INTEGER DEFAULT 0,
  additional_cost DECIMAL(10, 4) DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_tracking (user_id, api_calls, tokens_used, cost_usd, date)
  VALUES (user_uuid, additional_calls, additional_tokens, additional_cost, CURRENT_DATE)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    api_calls = ai_usage_tracking.api_calls + additional_calls,
    tokens_used = ai_usage_tracking.tokens_used + additional_tokens,
    cost_usd = ai_usage_tracking.cost_usd + additional_cost,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI function grants
GRANT EXECUTE ON FUNCTION get_user_ai_usage_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_ai_context() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_usage(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;

-- ============================================================================
-- REFRESH SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION: Run this SELECT after to confirm tables exist
-- ============================================================================
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
-- AND (tablename LIKE 'crm_%' OR tablename LIKE 'programme%' OR tablename LIKE 'ai_%')
-- ORDER BY tablename;
