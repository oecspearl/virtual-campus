-- STEP 3: Workflows & Programmes (Phase 5 + Programmes)
-- Run this after step-2 succeeds

-- Phase 5: Workflows
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

-- Programmes
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

-- If you see "Success" here, proceed to step-4.
