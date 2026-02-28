-- ============================================================================
-- CRM Phase 2: Engagement Scoring Engine
-- ============================================================================
-- Configurable weighted composite engagement scores with daily snapshots.
-- ============================================================================

-- Admin-configurable scoring weights
CREATE TABLE IF NOT EXISTS public.crm_engagement_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  config_name character varying NOT NULL DEFAULT 'default',
  weights jsonb NOT NULL DEFAULT '{
    "login_frequency": 0.15,
    "lesson_completion_rate": 0.20,
    "quiz_performance": 0.20,
    "assignment_submission_rate": 0.20,
    "discussion_participation": 0.10,
    "time_on_platform": 0.15
  }'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_engagement_config_pkey PRIMARY KEY (id),
  CONSTRAINT crm_engagement_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Daily engagement score snapshots per student
CREATE TABLE IF NOT EXISTS public.crm_engagement_scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  component_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  config_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_engagement_scores_pkey PRIMARY KEY (id),
  CONSTRAINT crm_engagement_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT crm_engagement_scores_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL,
  CONSTRAINT crm_engagement_scores_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.crm_engagement_config(id) ON DELETE SET NULL,
  CONSTRAINT crm_engagement_scores_unique UNIQUE (student_id, course_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_student_id ON public.crm_engagement_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_course_id ON public.crm_engagement_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_date ON public.crm_engagement_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_scores_score ON public.crm_engagement_scores(score);

-- RLS
ALTER TABLE public.crm_engagement_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_engagement_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_engagement_config_admin ON public.crm_engagement_config;
CREATE POLICY crm_engagement_config_admin ON public.crm_engagement_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS crm_engagement_scores_staff_read ON public.crm_engagement_scores;
CREATE POLICY crm_engagement_scores_staff_read ON public.crm_engagement_scores
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('instructor', 'admin', 'super_admin'))
  );

-- Insert default config
INSERT INTO public.crm_engagement_config (config_name, is_active)
VALUES ('default', true)
ON CONFLICT DO NOTHING;
