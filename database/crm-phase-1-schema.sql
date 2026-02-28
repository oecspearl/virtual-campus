-- ============================================================================
-- CRM Phase 1: Student Lifecycle, Interactions, and 360 Profile
-- ============================================================================
-- Adds the core CRM tables for tracking student lifecycle stages
-- and logging interactions/notes by instructors and admins.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STUDENT LIFECYCLE TRACKING
-- ============================================================================

-- Tracks which lifecycle stage each student is in, with full history.
-- Each row represents a stage transition. The most recent row per student
-- is their current stage.
CREATE TABLE IF NOT EXISTS public.crm_student_lifecycle (
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
  CONSTRAINT crm_student_lifecycle_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_student_lifecycle_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_student_id ON public.crm_student_lifecycle(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_stage ON public.crm_student_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_crm_lifecycle_changed_at ON public.crm_student_lifecycle(stage_changed_at DESC);

-- ============================================================================
-- CRM INTERACTIONS / NOTES
-- ============================================================================

-- Manual notes and interaction records logged by staff per student.
CREATE TABLE IF NOT EXISTS public.crm_interactions (
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
  CONSTRAINT crm_interactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_interactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_interactions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_interactions_student_id ON public.crm_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by ON public.crm_interactions(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON public.crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON public.crm_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_course_id ON public.crm_interactions(course_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.crm_student_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- Lifecycle: staff full access
DROP POLICY IF EXISTS crm_lifecycle_staff_access ON public.crm_student_lifecycle;
CREATE POLICY crm_lifecycle_staff_access ON public.crm_student_lifecycle
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

-- Lifecycle: students can read their own
DROP POLICY IF EXISTS crm_lifecycle_student_read ON public.crm_student_lifecycle;
CREATE POLICY crm_lifecycle_student_read ON public.crm_student_lifecycle
  FOR SELECT USING (student_id = auth.uid());

-- Interactions: staff full access
DROP POLICY IF EXISTS crm_interactions_staff_access ON public.crm_interactions;
CREATE POLICY crm_interactions_staff_access ON public.crm_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('instructor', 'admin', 'super_admin')
    )
  );

-- Interactions: students can read own non-private
DROP POLICY IF EXISTS crm_interactions_student_read ON public.crm_interactions;
CREATE POLICY crm_interactions_student_read ON public.crm_interactions
  FOR SELECT USING (
    student_id = auth.uid() AND is_private = false
  );
