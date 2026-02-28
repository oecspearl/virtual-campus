-- ============================================================================
-- Proctoring, Plagiarism Detection, and Question Banks Schema
-- ============================================================================
-- This script creates tables for:
-- 1. Proctoring integration (browser locking, remote proctoring)
-- 2. Plagiarism detection (Turnitin, Unicheck via LTI)
-- 3. Question banks (shared question repositories)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROCTORING TABLES
-- ============================================================================

-- Proctoring Sessions
-- Tracks proctoring sessions for quizzes and exams
CREATE TABLE public.proctoring_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id uuid,
  assignment_id uuid,
  student_id uuid NOT NULL,
  course_id uuid,
  session_type character varying NOT NULL CHECK (session_type IN ('browser_lock', 'remote_proctoring', 'ai_proctoring', 'hybrid')),
  proctoring_service character varying, -- 'respondus', 'proctoru', 'proctorexam', 'custom'
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'flagged', 'violated', 'cancelled')),
  
  -- Browser locking settings
  browser_lock_enabled boolean DEFAULT false,
  prevent_copy_paste boolean DEFAULT true,
  prevent_new_tabs boolean DEFAULT true,
  prevent_printing boolean DEFAULT true,
  prevent_screen_capture boolean DEFAULT true,
  require_fullscreen boolean DEFAULT false,
  allow_switching_tabs boolean DEFAULT false,
  max_tab_switches integer DEFAULT 0,
  
  -- Remote proctoring settings
  require_webcam boolean DEFAULT false,
  require_microphone boolean DEFAULT false,
  require_screen_share boolean DEFAULT false,
  ai_monitoring boolean DEFAULT false,
  human_review boolean DEFAULT false,
  
  -- Session tracking
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_seconds integer,
  
  -- Violations and flags
  violation_count integer DEFAULT 0,
  violations jsonb DEFAULT '[]'::jsonb, -- Array of violation records
  flags jsonb DEFAULT '[]'::jsonb, -- Array of flagged events
  review_status character varying DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewing', 'approved', 'rejected', 'needs_review')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  
  -- External service data
  external_session_id character varying, -- ID from proctoring service
  service_metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT proctoring_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT proctoring_sessions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT proctoring_sessions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT proctoring_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT proctoring_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL,
  CONSTRAINT proctoring_sessions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Proctoring Events
-- Logs all events during a proctoring session
CREATE TABLE public.proctoring_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  event_type character varying NOT NULL, -- 'tab_switch', 'copy_paste', 'new_tab', 'fullscreen_exit', 'webcam_lost', 'audio_lost', 'face_not_detected', 'multiple_faces', 'phone_detected', 'book_detected', etc.
  severity character varying DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  timestamp timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  screenshot_url text,
  video_timestamp integer, -- Seconds into recording
  auto_flagged boolean DEFAULT false,
  
  CONSTRAINT proctoring_events_pkey PRIMARY KEY (id),
  CONSTRAINT proctoring_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.proctoring_sessions(id) ON DELETE CASCADE
);

-- Proctoring Service Configurations
-- Stores configuration for different proctoring services
CREATE TABLE public.proctoring_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE, -- 'respondus', 'proctoru', 'proctorexam', 'custom'
  display_name character varying NOT NULL,
  service_type character varying NOT NULL CHECK (service_type IN ('browser_lock', 'remote_proctoring', 'ai_proctoring', 'hybrid')),
  api_endpoint text,
  api_key text, -- Encrypted
  api_secret text, -- Encrypted
  webhook_url text,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT proctoring_services_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- PLAGIARISM DETECTION TABLES
-- ============================================================================

-- Plagiarism Checks
-- Tracks plagiarism checks for assignments and submissions
CREATE TABLE public.plagiarism_checks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid,
  assignment_id uuid,
  student_id uuid NOT NULL,
  course_id uuid,
  
  -- Service information
  service_type character varying NOT NULL CHECK (service_type IN ('turnitin', 'unicheck', 'copyscape', 'custom')),
  lti_tool_id uuid, -- If using LTI integration
  
  -- Check status
  status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  submitted_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  -- Results
  similarity_score numeric, -- 0-100 percentage
  originality_score numeric, -- 0-100 percentage
  match_count integer DEFAULT 0,
  word_count integer,
  character_count integer,
  
  -- Detailed results
  matches jsonb DEFAULT '[]'::jsonb, -- Array of match objects
  sources jsonb DEFAULT '[]'::jsonb, -- Array of matched sources
  report_url text, -- URL to full plagiarism report
  report_id character varying, -- External report ID
  
  -- Service metadata
  external_check_id character varying, -- ID from plagiarism service
  service_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Review
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  action_taken character varying, -- 'none', 'warning', 'penalty', 'reject', 'investigate'
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT plagiarism_checks_pkey PRIMARY KEY (id),
  CONSTRAINT plagiarism_checks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  CONSTRAINT plagiarism_checks_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT plagiarism_checks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT plagiarism_checks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL,
  CONSTRAINT plagiarism_checks_lti_tool_id_fkey FOREIGN KEY (lti_tool_id) REFERENCES public.lti_tools(id) ON DELETE SET NULL,
  CONSTRAINT plagiarism_checks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Plagiarism Service Configurations
-- Stores configuration for plagiarism detection services
CREATE TABLE public.plagiarism_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE, -- 'turnitin', 'unicheck', 'copyscape'
  display_name character varying NOT NULL,
  service_type character varying NOT NULL CHECK (service_type IN ('lti', 'api', 'both')),
  lti_tool_id uuid, -- If using LTI
  api_endpoint text,
  api_key text, -- Encrypted
  api_secret text, -- Encrypted
  default_threshold numeric DEFAULT 25, -- Default similarity threshold for flagging
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT plagiarism_services_pkey PRIMARY KEY (id),
  CONSTRAINT plagiarism_services_lti_tool_id_fkey FOREIGN KEY (lti_tool_id) REFERENCES public.lti_tools(id) ON DELETE SET NULL
);

-- ============================================================================
-- QUESTION BANKS TABLES
-- ============================================================================

-- Question Banks
-- Shared repositories of questions
CREATE TABLE public.question_banks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  organization_id uuid, -- For multi-tenant support (optional)
  created_by uuid NOT NULL,
  is_public boolean DEFAULT false, -- Public to all instructors
  is_shared boolean DEFAULT false, -- Shared within organization
  access_level character varying DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public', 'organization')),
  
  -- Metadata
  subject_area character varying,
  grade_level character varying,
  tags text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Statistics
  question_count integer DEFAULT 0,
  usage_count integer DEFAULT 0, -- How many times questions from this bank have been used
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT question_banks_pkey PRIMARY KEY (id),
  CONSTRAINT question_banks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Question Bank Questions
-- Questions stored in question banks (separate from quiz questions)
CREATE TABLE public.question_bank_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bank_id uuid NOT NULL,
  created_by uuid NOT NULL,
  
  -- Question content (same structure as questions table)
  type character varying NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching')),
  question_text text NOT NULL,
  points integer DEFAULT 1,
  options jsonb,
  correct_answer jsonb,
  case_sensitive boolean DEFAULT false,
  feedback_correct text,
  feedback_incorrect text,
  explanation text, -- Explanation of the correct answer
  
  -- Metadata
  difficulty character varying CHECK (difficulty IN ('easy', 'medium', 'hard')),
  subject_area character varying,
  topic character varying,
  tags text[] DEFAULT ARRAY[]::text[],
  learning_objectives text[],
  bloom_taxonomy_level character varying, -- 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  
  -- Usage tracking
  usage_count integer DEFAULT 0, -- How many times this question has been used in quizzes
  last_used_at timestamp with time zone,
  
  -- Quality metrics
  average_score numeric, -- Average score students get on this question
  discrimination_index numeric, -- How well question discriminates between high/low performers
  difficulty_index numeric, -- Percentage of students who answered correctly
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT question_bank_questions_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_questions_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.question_banks(id) ON DELETE CASCADE,
  CONSTRAINT question_bank_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Question Bank Access
-- Controls who can access which question banks
CREATE TABLE public.question_bank_access (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bank_id uuid NOT NULL,
  user_id uuid NOT NULL,
  access_type character varying DEFAULT 'read' CHECK (access_type IN ('read', 'write', 'admin')),
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT question_bank_access_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_access_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.question_banks(id) ON DELETE CASCADE,
  CONSTRAINT question_bank_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT question_bank_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT question_bank_access_unique UNIQUE (bank_id, user_id)
);

-- Question Bank Usage
-- Tracks when questions from banks are used in quizzes
CREATE TABLE public.question_bank_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bank_question_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  question_id uuid, -- The question instance in the quiz (if copied)
  used_by uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT question_bank_usage_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_usage_bank_question_id_fkey FOREIGN KEY (bank_question_id) REFERENCES public.question_bank_questions(id) ON DELETE CASCADE,
  CONSTRAINT question_bank_usage_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT question_bank_usage_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE SET NULL,
  CONSTRAINT question_bank_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Proctoring indexes
CREATE INDEX idx_proctoring_sessions_quiz_id ON public.proctoring_sessions(quiz_id);
CREATE INDEX idx_proctoring_sessions_student_id ON public.proctoring_sessions(student_id);
CREATE INDEX idx_proctoring_sessions_status ON public.proctoring_sessions(status);
CREATE INDEX idx_proctoring_sessions_started_at ON public.proctoring_sessions(started_at);
CREATE INDEX idx_proctoring_events_session_id ON public.proctoring_events(session_id);
CREATE INDEX idx_proctoring_events_timestamp ON public.proctoring_events(timestamp);
CREATE INDEX idx_proctoring_events_severity ON public.proctoring_events(severity);

-- Plagiarism indexes
CREATE INDEX idx_plagiarism_checks_submission_id ON public.plagiarism_checks(submission_id);
CREATE INDEX idx_plagiarism_checks_assignment_id ON public.plagiarism_checks(assignment_id);
CREATE INDEX idx_plagiarism_checks_student_id ON public.plagiarism_checks(student_id);
CREATE INDEX idx_plagiarism_checks_status ON public.plagiarism_checks(status);
CREATE INDEX idx_plagiarism_checks_similarity_score ON public.plagiarism_checks(similarity_score);

-- Question bank indexes
CREATE INDEX idx_question_banks_created_by ON public.question_banks(created_by);
CREATE INDEX idx_question_banks_access_level ON public.question_banks(access_level);
CREATE INDEX idx_question_banks_tags ON public.question_banks USING GIN(tags);
CREATE INDEX idx_question_bank_questions_bank_id ON public.question_bank_questions(bank_id);
CREATE INDEX idx_question_bank_questions_type ON public.question_bank_questions(type);
CREATE INDEX idx_question_bank_questions_tags ON public.question_bank_questions USING GIN(tags);
CREATE INDEX idx_question_bank_access_bank_id ON public.question_bank_access(bank_id);
CREATE INDEX idx_question_bank_access_user_id ON public.question_bank_access(user_id);
CREATE INDEX idx_question_bank_usage_bank_question_id ON public.question_bank_usage(bank_question_id);
CREATE INDEX idx_question_bank_usage_quiz_id ON public.question_bank_usage(quiz_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_usage ENABLE ROW LEVEL SECURITY;

-- Proctoring Sessions: Students can view their own, instructors can view all in their courses
CREATE POLICY proctoring_sessions_student_access ON public.proctoring_sessions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = proctoring_sessions.course_id
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
      )
    )
  );

CREATE POLICY proctoring_sessions_admin_all ON public.proctoring_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Proctoring Events: Same access as sessions
CREATE POLICY proctoring_events_session_access ON public.proctoring_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.proctoring_sessions
      WHERE proctoring_sessions.id = proctoring_events.session_id
      AND (
        proctoring_sessions.student_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('instructor', 'admin', 'super_admin')
        )
      )
    )
  );

-- Plagiarism Checks: Students can view their own, instructors can view all in their courses
CREATE POLICY plagiarism_checks_student_access ON public.plagiarism_checks
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = plagiarism_checks.course_id
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
      )
    )
  );

CREATE POLICY plagiarism_checks_admin_all ON public.plagiarism_checks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Question Banks: Based on access level and permissions
CREATE POLICY question_banks_access ON public.question_banks
  FOR SELECT USING (
    created_by = auth.uid() OR
    is_public = true OR
    access_level = 'public' OR
    EXISTS (
      SELECT 1 FROM public.question_bank_access
      WHERE question_bank_access.bank_id = question_banks.id
      AND question_bank_access.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY question_banks_write ON public.question_banks
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.question_bank_access
      WHERE question_bank_access.bank_id = question_banks.id
      AND question_bank_access.user_id = auth.uid()
      AND question_bank_access.access_type IN ('write', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Question Bank Questions: Based on bank access
CREATE POLICY question_bank_questions_access ON public.question_bank_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.question_banks
      WHERE question_banks.id = question_bank_questions.bank_id
      AND (
        question_banks.created_by = auth.uid() OR
        question_banks.is_public = true OR
        question_banks.access_level = 'public' OR
        EXISTS (
          SELECT 1 FROM public.question_bank_access
          WHERE question_bank_access.bank_id = question_banks.id
          AND question_bank_access.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_proctoring_sessions_updated_at BEFORE UPDATE ON public.proctoring_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proctoring_services_updated_at BEFORE UPDATE ON public.proctoring_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plagiarism_checks_updated_at BEFORE UPDATE ON public.plagiarism_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plagiarism_services_updated_at BEFORE UPDATE ON public.plagiarism_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_banks_updated_at BEFORE UPDATE ON public.question_banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_questions_updated_at BEFORE UPDATE ON public.question_bank_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update question count in question banks
CREATE OR REPLACE FUNCTION update_question_bank_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.question_banks
    SET question_count = question_count + 1
    WHERE id = NEW.bank_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.question_banks
    SET question_count = GREATEST(0, question_count - 1)
    WHERE id = OLD.bank_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_bank_count_trigger
  AFTER INSERT OR DELETE ON public.question_bank_questions
  FOR EACH ROW EXECUTE FUNCTION update_question_bank_count();

