-- ============================================================================
-- CRM Phase 3: Segmentation Engine
-- ============================================================================
-- Dynamic student segments with configurable filter criteria.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_segments (
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
  CONSTRAINT crm_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.crm_segment_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  segment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_segment_members_pkey PRIMARY KEY (id),
  CONSTRAINT crm_segment_members_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.crm_segments(id) ON DELETE CASCADE,
  CONSTRAINT crm_segment_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_segment_members_unique UNIQUE (segment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_segments_created_by ON public.crm_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_id ON public.crm_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_student_id ON public.crm_segment_members(student_id);

-- RLS
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segment_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_segments_staff_access ON public.crm_segments;
CREATE POLICY crm_segments_staff_access ON public.crm_segments
  FOR ALL USING (
    created_by = auth.uid() OR
    is_shared = true OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_segment_members_staff_read ON public.crm_segment_members;
CREATE POLICY crm_segment_members_staff_read ON public.crm_segment_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );
