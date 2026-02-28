-- ============================================================================
-- LTI 1.3 and OneRoster Database Schema
-- ============================================================================
-- This script creates tables for Learning Tools Interoperability (LTI) 1.3
-- and OneRoster standards support
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LTI 1.3 TABLES
-- ============================================================================

-- LTI Tool Registrations
-- Stores registered external tools (Zoom, Turnitin, Khan Academy, etc.)
CREATE TABLE public.lti_tools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  tool_url text NOT NULL,
  login_url text,
  launch_url text NOT NULL,
  redirect_uris text[] DEFAULT ARRAY[]::text[],
  client_id character varying NOT NULL UNIQUE,
  platform_public_key text,
  tool_public_key text,
  tool_keyset_url text,
  tool_oidc_login_url text,
  deployment_id character varying,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT lti_tools_pkey PRIMARY KEY (id),
  CONSTRAINT lti_tools_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- LTI Platform Configuration
-- Stores platform-level LTI configuration (issuer, keys, etc.)
CREATE TABLE public.lti_platform_config (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  issuer character varying NOT NULL UNIQUE,
  platform_public_key text NOT NULL,
  platform_private_key text NOT NULL,
  authorization_server text NOT NULL,
  token_endpoint text NOT NULL,
  jwks_uri text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_platform_config_pkey PRIMARY KEY (id)
);

-- LTI Launches
-- Tracks LTI launches for audit and session management
CREATE TABLE public.lti_launches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tool_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid,
  class_id uuid,
  nonce character varying NOT NULL UNIQUE,
  state character varying,
  launch_presentation_return_url text,
  message_type character varying DEFAULT 'LtiResourceLinkRequest',
  version character varying DEFAULT '1.3.0',
  resource_link_id uuid,
  context_id uuid,
  context_title character varying,
  context_label character varying,
  roles text[],
  custom_parameters jsonb DEFAULT '{}'::jsonb,
  launch_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT lti_launches_pkey PRIMARY KEY (id),
  CONSTRAINT lti_launches_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.lti_tools(id) ON DELETE CASCADE,
  CONSTRAINT lti_launches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT lti_launches_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- LTI Grade Passback
-- Stores grades received from external tools
CREATE TABLE public.lti_grade_passback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  launch_id uuid NOT NULL,
  tool_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid,
  assignment_id uuid,
  lineitem_id character varying,
  score_given numeric,
  score_maximum numeric,
  comment text,
  activity_progress character varying CHECK (activity_progress IN ('Initialized', 'Started', 'InProgress', 'Submitted', 'Completed')),
  grading_progress character varying CHECK (grading_progress IN ('NotReady', 'Failed', 'Pending', 'PendingManual', 'FullyGraded')),
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_grade_passback_pkey PRIMARY KEY (id),
  CONSTRAINT lti_grade_passback_launch_id_fkey FOREIGN KEY (launch_id) REFERENCES public.lti_launches(id) ON DELETE CASCADE,
  CONSTRAINT lti_grade_passback_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.lti_tools(id) ON DELETE CASCADE,
  CONSTRAINT lti_grade_passback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT lti_grade_passback_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- LTI Deep Linking
-- Stores deep linking configurations for content selection
CREATE TABLE public.lti_deep_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tool_id uuid NOT NULL,
  course_id uuid,
  instructor_id uuid NOT NULL,
  content_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text,
  data text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_deep_links_pkey PRIMARY KEY (id),
  CONSTRAINT lti_deep_links_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.lti_tools(id) ON DELETE CASCADE,
  CONSTRAINT lti_deep_links_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT lti_deep_links_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- LTI Access Tokens
-- Stores OAuth 2.0 access tokens for tool communication
CREATE TABLE public.lti_access_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tool_id uuid NOT NULL,
  access_token text NOT NULL,
  token_type character varying DEFAULT 'Bearer',
  expires_at timestamp with time zone NOT NULL,
  scope text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_access_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT lti_access_tokens_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.lti_tools(id) ON DELETE CASCADE
);

-- ============================================================================
-- ONEROSTER TABLES
-- ============================================================================

-- OneRoster Organizations
-- Represents schools, districts, or institutions
CREATE TABLE public.oneroster_organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  name character varying NOT NULL,
  identifier character varying,
  type character varying NOT NULL CHECK (type IN ('district', 'school', 'department', 'local', 'state', 'national')),
  parent_sourced_id character varying,
  CONSTRAINT oneroster_organizations_pkey PRIMARY KEY (id)
);

-- OneRoster Academic Sessions
-- Represents terms, semesters, or academic periods
CREATE TABLE public.oneroster_academic_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  title character varying NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type character varying NOT NULL CHECK (type IN ('gradingPeriod', 'semester', 'schoolYear', 'term')),
  parent_sourced_id character varying,
  school_year character varying,
  CONSTRAINT oneroster_academic_sessions_pkey PRIMARY KEY (id)
);

-- OneRoster Classes
-- Represents course sections or classes
CREATE TABLE public.oneroster_classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  title character varying NOT NULL,
  class_code character varying,
  class_type character varying CHECK (class_type IN ('homeroom', 'scheduled')),
  location character varying,
  grades text[],
  subjects text[],
  course_sourced_id character varying,
  school_sourced_id character varying,
  term_sourced_ids text[],
  periods text[],
  lms_course_id uuid,
  CONSTRAINT oneroster_classes_pkey PRIMARY KEY (id),
  CONSTRAINT oneroster_classes_lms_course_id_fkey FOREIGN KEY (lms_course_id) REFERENCES public.courses(id) ON DELETE SET NULL
);

-- OneRoster Users
-- Links LMS users to OneRoster sourced IDs
CREATE TABLE public.oneroster_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  username character varying,
  user_ids jsonb DEFAULT '[]'::jsonb,
  given_name character varying,
  family_name character varying,
  middle_name character varying,
  identifier character varying,
  email character varying,
  sms character varying,
  phone character varying,
  agents jsonb DEFAULT '[]'::jsonb,
  org_sourced_ids text[],
  role character varying NOT NULL CHECK (role IN ('administrator', 'aide', 'guardian', 'parent', 'proctor', 'relative', 'student', 'teacher')),
  lms_user_id uuid NOT NULL,
  CONSTRAINT oneroster_users_pkey PRIMARY KEY (id),
  CONSTRAINT oneroster_users_lms_user_id_fkey FOREIGN KEY (lms_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- OneRoster Enrollments
-- Links users to classes
CREATE TABLE public.oneroster_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  user_sourced_id character varying NOT NULL,
  class_sourced_id character varying NOT NULL,
  role character varying NOT NULL CHECK (role IN ('student', 'teacher', 'administrator')),
  primary_flag boolean DEFAULT false,
  begin_date date,
  end_date date,
  lms_user_id uuid,
  lms_class_id uuid,
  CONSTRAINT oneroster_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT oneroster_enrollments_lms_user_id_fkey FOREIGN KEY (lms_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT oneroster_enrollments_lms_class_id_fkey FOREIGN KEY (lms_class_id) REFERENCES public.oneroster_classes(id) ON DELETE CASCADE
);

-- OneRoster Line Items (Assignments/Gradebook Items)
CREATE TABLE public.oneroster_lineitems (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  title character varying NOT NULL,
  description text,
  assign_date date,
  due_date date,
  class_sourced_id character varying NOT NULL,
  category_sourced_id character varying,
  result_value_min numeric,
  result_value_max numeric,
  lms_assignment_id uuid,
  CONSTRAINT oneroster_lineitems_pkey PRIMARY KEY (id),
  CONSTRAINT oneroster_lineitems_lms_assignment_id_fkey FOREIGN KEY (lms_assignment_id) REFERENCES public.assignments(id) ON DELETE SET NULL
);

-- OneRoster Results (Grades)
CREATE TABLE public.oneroster_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sourced_id character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'tobedeleted')),
  date_last_modified timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  user_sourced_id character varying NOT NULL,
  class_sourced_id character varying NOT NULL,
  lineitem_sourced_id character varying NOT NULL,
  score numeric,
  score_status character varying CHECK (score_status IN ('exempt', 'fullyGraded', 'notSubmitted', 'partiallyGraded', 'submitted')),
  score_date timestamp with time zone,
  comment text,
  lms_user_id uuid,
  lms_class_id uuid,
  lms_lineitem_id uuid,
  CONSTRAINT oneroster_results_pkey PRIMARY KEY (id),
  CONSTRAINT oneroster_results_lms_user_id_fkey FOREIGN KEY (lms_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT oneroster_results_lms_class_id_fkey FOREIGN KEY (lms_class_id) REFERENCES public.oneroster_classes(id) ON DELETE CASCADE,
  CONSTRAINT oneroster_results_lms_lineitem_id_fkey FOREIGN KEY (lms_lineitem_id) REFERENCES public.oneroster_lineitems(id) ON DELETE CASCADE
);

-- OneRoster API Clients
-- Stores OAuth client credentials for SIS systems
CREATE TABLE public.oneroster_clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id character varying NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  name character varying NOT NULL,
  description text,
  allowed_scopes text[] DEFAULT ARRAY[]::text[],
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT oneroster_clients_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- LTI Indexes
CREATE INDEX idx_lti_tools_client_id ON public.lti_tools(client_id);
CREATE INDEX idx_lti_tools_status ON public.lti_tools(status);
CREATE INDEX idx_lti_launches_tool_id ON public.lti_launches(tool_id);
CREATE INDEX idx_lti_launches_user_id ON public.lti_launches(user_id);
CREATE INDEX idx_lti_launches_nonce ON public.lti_launches(nonce);
CREATE INDEX idx_lti_launches_expires_at ON public.lti_launches(expires_at);
CREATE INDEX idx_lti_grade_passback_launch_id ON public.lti_grade_passback(launch_id);
CREATE INDEX idx_lti_grade_passback_user_id ON public.lti_grade_passback(user_id);
CREATE INDEX idx_lti_access_tokens_tool_id ON public.lti_access_tokens(tool_id);
CREATE INDEX idx_lti_access_tokens_expires_at ON public.lti_access_tokens(expires_at);

-- OneRoster Indexes
CREATE INDEX idx_oneroster_organizations_sourced_id ON public.oneroster_organizations(sourced_id);
CREATE INDEX idx_oneroster_academic_sessions_sourced_id ON public.oneroster_academic_sessions(sourced_id);
CREATE INDEX idx_oneroster_classes_sourced_id ON public.oneroster_classes(sourced_id);
CREATE INDEX idx_oneroster_classes_lms_course_id ON public.oneroster_classes(lms_course_id);
CREATE INDEX idx_oneroster_users_sourced_id ON public.oneroster_users(sourced_id);
CREATE INDEX idx_oneroster_users_lms_user_id ON public.oneroster_users(lms_user_id);
CREATE INDEX idx_oneroster_enrollments_user_sourced_id ON public.oneroster_enrollments(user_sourced_id);
CREATE INDEX idx_oneroster_enrollments_class_sourced_id ON public.oneroster_enrollments(class_sourced_id);
CREATE INDEX idx_oneroster_lineitems_class_sourced_id ON public.oneroster_lineitems(class_sourced_id);
CREATE INDEX idx_oneroster_results_user_sourced_id ON public.oneroster_results(user_sourced_id);
CREATE INDEX idx_oneroster_results_class_sourced_id ON public.oneroster_results(class_sourced_id);
CREATE INDEX idx_oneroster_results_lineitem_sourced_id ON public.oneroster_results(lineitem_sourced_id);
CREATE INDEX idx_oneroster_clients_client_id ON public.oneroster_clients(client_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.lti_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_grade_passback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_deep_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_lineitems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oneroster_clients ENABLE ROW LEVEL SECURITY;

-- LTI Tools: Admins can manage, instructors can view active tools
CREATE POLICY lti_tools_admin_all ON public.lti_tools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY lti_tools_instructor_view ON public.lti_tools
  FOR SELECT USING (
    status = 'active' AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
      )
    )
  );

-- LTI Launches: Users can only see their own launches
CREATE POLICY lti_launches_user_access ON public.lti_launches
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- LTI Grade Passback: Users can view their own grades, instructors can view all in their courses
CREATE POLICY lti_grade_passback_user_access ON public.lti_grade_passback
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lti_grade_passback.course_id
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('instructor', 'admin', 'super_admin')
      )
    )
  );

-- OneRoster: Admin access only
CREATE POLICY oneroster_admin_access ON public.oneroster_organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY oneroster_admin_access_classes ON public.oneroster_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY oneroster_admin_access_users ON public.oneroster_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
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
CREATE TRIGGER update_lti_tools_updated_at BEFORE UPDATE ON public.lti_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lti_grade_passback_updated_at BEFORE UPDATE ON public.lti_grade_passback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oneroster_clients_updated_at BEFORE UPDATE ON public.oneroster_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

