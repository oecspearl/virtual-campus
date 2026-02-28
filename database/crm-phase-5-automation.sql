-- ============================================================================
-- CRM Phase 5: Automation Workflows
-- ============================================================================
-- Event-driven trigger -> condition -> action chains.
-- ============================================================================

-- Workflow definitions
CREATE TABLE IF NOT EXISTS public.crm_workflows (
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
  CONSTRAINT crm_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Workflow execution audit log
CREATE TABLE IF NOT EXISTS public.crm_workflow_executions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workflow_id uuid NOT NULL,
  student_id uuid,
  trigger_data jsonb DEFAULT '{}'::jsonb,
  actions_executed jsonb DEFAULT '[]'::jsonb,
  status character varying DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_workflow_executions_pkey PRIMARY KEY (id),
  CONSTRAINT crm_workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.crm_workflows(id) ON DELETE CASCADE,
  CONSTRAINT crm_workflow_executions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by ON public.crm_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_is_active ON public.crm_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_workflows_trigger_type ON public.crm_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_workflow_id ON public.crm_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_student_id ON public.crm_workflow_executions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_executed_at ON public.crm_workflow_executions(executed_at DESC);

-- RLS
ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_workflows_admin_access ON public.crm_workflows;
CREATE POLICY crm_workflows_admin_access ON public.crm_workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_workflow_executions_admin_read ON public.crm_workflow_executions;
CREATE POLICY crm_workflow_executions_admin_read ON public.crm_workflow_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );
