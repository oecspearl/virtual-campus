-- ============================================================================
-- CRM Phase 4: Communication Hub & Task System
-- ============================================================================
-- Email campaigns, recipient tracking, and staff follow-up tasks.
-- ============================================================================

-- Campaigns
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
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
  stats jsonb DEFAULT '{"total": 0, "sent": 0, "failed": 0, "opened": 0, "clicked": 0}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT crm_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_campaigns_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.crm_segments(id) ON DELETE SET NULL
);

-- Campaign Recipients
CREATE TABLE IF NOT EXISTS public.crm_campaign_recipients (
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
  CONSTRAINT crm_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT crm_campaign_recipients_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
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
  CONSTRAINT crm_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_tasks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT crm_tasks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_created_by ON public.crm_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON public.crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_segment_id ON public.crm_campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_scheduled_for ON public.crm_campaigns(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign_id ON public.crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_student_id ON public.crm_campaign_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_status ON public.crm_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON public.crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_created_by ON public.crm_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_student_id ON public.crm_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON public.crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON public.crm_tasks(priority);

-- RLS
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_campaigns_staff_access ON public.crm_campaigns;
CREATE POLICY crm_campaigns_staff_access ON public.crm_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_campaign_recipients_staff_read ON public.crm_campaign_recipients;
CREATE POLICY crm_campaign_recipients_staff_read ON public.crm_campaign_recipients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_tasks_access ON public.crm_tasks;
CREATE POLICY crm_tasks_access ON public.crm_tasks
  FOR ALL USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );
