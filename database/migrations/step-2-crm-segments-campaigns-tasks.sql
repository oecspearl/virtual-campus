-- STEP 2: Segments, Campaigns, Tasks (Phase 3-4)
-- Run this after step-1 succeeds

-- Phase 3: Segments
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

-- Phase 4: Campaigns
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

-- Phase 4: Campaign Recipients
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

-- Phase 4: Tasks
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

-- If you see "Success" here, proceed to step-3.
