-- STEP 1: CRM Core Tables (Phase 1-2)
-- Run this first in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Phase 1: Student Lifecycle
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

-- Phase 1: Interactions
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

-- Phase 2: Engagement Config
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

-- Phase 2: Engagement Scores
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

-- If you see "Success" here, proceed to step-2.
