-- STEP 4: Application tables, Indexes, RLS, Grants
-- Run this after step-3 succeeds

-- Application form fields per campaign
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

-- Submitted applications
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_campaign_recipients_application_token
  ON crm_campaign_recipients(application_token);

-- ============================================================================
-- ALL INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_student_id ON crm_student_lifecycle(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_stage ON crm_student_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_changed_at ON crm_student_lifecycle(stage_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_student_id ON crm_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by ON crm_interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON crm_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_course_id ON crm_interactions(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_student_id ON crm_engagement_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_course_id ON crm_engagement_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_date ON crm_engagement_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_score ON crm_engagement_scores(score);
CREATE INDEX IF NOT EXISTS idx_crm_segments_created_by ON crm_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_id ON crm_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_student_id ON crm_segment_members(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_created_by ON crm_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_segment_id ON crm_campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_scheduled_for ON crm_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign_id ON crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_student_id ON crm_campaign_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_status ON crm_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_created_by ON crm_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_student_id ON crm_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by ON crm_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_is_active ON crm_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_trigger_type ON crm_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_workflow_id ON crm_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_student_id ON crm_workflow_executions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_executed_at ON crm_workflow_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_programmes_slug ON programmes(slug);
CREATE INDEX IF NOT EXISTS idx_programmes_published ON programmes(published);
CREATE INDEX IF NOT EXISTS idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_courses_course ON programme_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_programme ON programme_enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_student ON programme_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_status ON programme_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_programme_application_fields_campaign_id ON programme_application_fields(campaign_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_campaign_id ON programme_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_programme_id ON programme_applications(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_applicant_id ON programme_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_programme_applications_status ON programme_applications(status);
CREATE INDEX IF NOT EXISTS idx_programme_applications_recipient_id ON programme_applications(recipient_id);

-- ============================================================================
-- RLS
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

-- If you see "Success" here, proceed to step-5.
