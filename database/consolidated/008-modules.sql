-- ============================================================================
-- Part 8: Surveys, Categories, i18n, Accessibility, Programmes, Admissions
-- ============================================================================
-- Depends on: 001, 002
-- ============================================================================

-- ============================================================================
-- SURVEYS
-- ============================================================================

CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  survey_type VARCHAR(50) DEFAULT 'course_evaluation'
    CHECK (survey_type IN ('course_evaluation', 'lesson_feedback', 'instructor_evaluation', 'nps', 'custom')),
  is_anonymous BOOLEAN DEFAULT true,
  allow_multiple_responses BOOLEAN DEFAULT false,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  randomize_questions BOOLEAN DEFAULT false,
  show_progress_bar BOOLEAN DEFAULT true,
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  published BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surveys_tenant ON surveys(tenant_id);
CREATE INDEX idx_surveys_course ON surveys(course_id);
CREATE INDEX idx_surveys_published ON surveys(published) WHERE published = true;

-- ============================================================================
-- SURVEY QUESTIONS
-- ============================================================================

CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'likert_scale', 'rating_scale', 'multiple_choice', 'multiple_select',
    'text', 'essay', 'matrix', 'ranking', 'nps', 'slider'
  )),
  question_text TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  required BOOLEAN DEFAULT true,
  options JSONB,
  conditional_logic JSONB,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_questions_tenant ON survey_questions(tenant_id);
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX idx_survey_questions_order ON survey_questions(survey_id, "order");

-- ============================================================================
-- SURVEY RESPONSES
-- ============================================================================

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  answers JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  completion_time INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_tenant ON survey_responses(tenant_id);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);

-- ============================================================================
-- SURVEY ANALYTICS
-- ============================================================================

CREATE TABLE public.survey_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  survey_id UUID NOT NULL UNIQUE REFERENCES surveys(id) ON DELETE CASCADE,
  response_count INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2),
  avg_completion_time INTEGER,
  question_stats JSONB DEFAULT '{}',
  nps_score NUMERIC(5,2),
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_analytics_tenant ON survey_analytics(tenant_id);

-- ============================================================================
-- SURVEY TEMPLATES
-- ============================================================================

CREATE TABLE public.survey_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  survey_type VARCHAR(50),
  questions JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_templates_tenant ON survey_templates(tenant_id);
CREATE INDEX idx_survey_templates_system ON survey_templates(is_system) WHERE is_system = true;

-- ============================================================================
-- COURSE CATEGORIES
-- ============================================================================

CREATE TABLE public.course_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'material-symbols:folder',
  color VARCHAR(20) DEFAULT '#3B82F6',
  parent_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug)
);

CREATE INDEX idx_course_categories_tenant ON course_categories(tenant_id);
CREATE INDEX idx_course_categories_parent ON course_categories(parent_id);
CREATE INDEX idx_course_categories_slug ON course_categories(slug);
CREATE INDEX idx_course_categories_active ON course_categories(is_active, "order");
CREATE INDEX idx_course_categories_global ON course_categories(is_global) WHERE is_global = true;

-- ============================================================================
-- COURSE CATEGORY ASSIGNMENTS
-- ============================================================================

CREATE TABLE public.course_category_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, category_id)
);

CREATE INDEX idx_course_category_assignments_tenant ON course_category_assignments(tenant_id);
CREATE INDEX idx_course_category_assignments_course ON course_category_assignments(course_id);
CREATE INDEX idx_course_category_assignments_category ON course_category_assignments(category_id);

-- ============================================================================
-- TRANSLATIONS (i18n)
-- ============================================================================

CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  translation TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id, field_name, locale)
);

CREATE INDEX idx_translations_tenant ON translations(tenant_id);
CREATE INDEX idx_translations_content ON translations(content_type, content_id, locale);
CREATE INDEX idx_translations_locale ON translations(locale);

-- ============================================================================
-- SUPPORTED LOCALES
-- ============================================================================

CREATE TABLE public.supported_locales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  is_rtl BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supported_locales_tenant ON supported_locales(tenant_id);

-- ============================================================================
-- ACCESSIBILITY REPORTS
-- ============================================================================

CREATE TABLE public.accessibility_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  checked_by UUID REFERENCES users(id),
  UNIQUE(content_type, content_id)
);

CREATE INDEX idx_accessibility_reports_tenant ON accessibility_reports(tenant_id);
CREATE INDEX idx_accessibility_reports_content ON accessibility_reports(content_type, content_id);

-- ============================================================================
-- VIDEO CAPTIONS
-- ============================================================================

CREATE TABLE public.video_captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  video_url TEXT NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  label VARCHAR(100),
  caption_format VARCHAR(20) NOT NULL DEFAULT 'vtt',
  caption_url TEXT NOT NULL,
  caption_content TEXT,
  auto_generated BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_url, language)
);

CREATE INDEX idx_video_captions_tenant ON video_captions(tenant_id);
CREATE INDEX idx_video_captions_lesson ON video_captions(lesson_id);

-- ============================================================================
-- ACCESSIBILITY PREFERENCES
-- ============================================================================

CREATE TABLE public.accessibility_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  high_contrast BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  large_text BOOLEAN DEFAULT false,
  screen_reader_optimized BOOLEAN DEFAULT false,
  captions_enabled BOOLEAN DEFAULT true,
  caption_language VARCHAR(10) DEFAULT 'en',
  caption_font_size VARCHAR(20) DEFAULT 'medium',
  caption_background VARCHAR(20) DEFAULT 'black',
  keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
  focus_indicators_enhanced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accessibility_preferences_tenant ON accessibility_preferences(tenant_id);
CREATE INDEX idx_accessibility_preferences_user ON accessibility_preferences(user_id);

-- ============================================================================
-- PROGRAMMES
-- ============================================================================

CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  thumbnail VARCHAR(500),
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration VARCHAR(100),
  passing_score DECIMAL(5,2) DEFAULT 70.00,
  published BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);
CREATE INDEX idx_programmes_slug ON programmes(slug);
CREATE INDEX idx_programmes_published ON programmes(published);
CREATE INDEX idx_programmes_global ON programmes(is_global) WHERE is_global = true;

-- ============================================================================
-- PROGRAMME COURSES
-- ============================================================================

CREATE TABLE public.programme_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) DEFAULT 1.00,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(programme_id, course_id)
);

CREATE INDEX idx_programme_courses_tenant ON programme_courses(tenant_id);
CREATE INDEX idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX idx_programme_courses_course ON programme_courses(course_id);

-- ============================================================================
-- PROGRAMME ENROLLMENTS
-- ============================================================================

CREATE TABLE public.programme_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  final_score DECIMAL(5,2),
  certificate_issued BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(programme_id, student_id)
);

CREATE INDEX idx_programme_enrollments_tenant ON programme_enrollments(tenant_id);
CREATE INDEX idx_programme_enrollments_programme ON programme_enrollments(programme_id);
CREATE INDEX idx_programme_enrollments_student ON programme_enrollments(student_id);
CREATE INDEX idx_programme_enrollments_status ON programme_enrollments(status);

-- ============================================================================
-- ADMISSION FORMS
-- ============================================================================

CREATE TABLE public.admission_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_forms_tenant ON admission_forms(tenant_id);
CREATE INDEX idx_admission_forms_slug ON admission_forms(slug);
CREATE INDEX idx_admission_forms_status ON admission_forms(status);

-- ============================================================================
-- ADMISSION FORM FIELDS
-- ============================================================================

CREATE TABLE public.admission_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  form_id UUID NOT NULL REFERENCES admission_forms(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'text', 'essay', 'email', 'phone', 'date',
    'select', 'multiple_choice', 'multiple_select',
    'file_upload', 'rating_scale'
  )),
  label VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder VARCHAR(255),
  "order" INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '{}'::jsonb,
  section VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_form_fields_tenant ON admission_form_fields(tenant_id);
CREATE INDEX idx_admission_form_fields_form ON admission_form_fields(form_id);

-- ============================================================================
-- ADMISSION APPLICATIONS
-- ============================================================================

CREATE TABLE public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  form_id UUID NOT NULL REFERENCES admission_forms(id) ON DELETE CASCADE,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(50),
  answers JSONB DEFAULT '[]'::jsonb,
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'changes_requested',
    'resubmitted', 'approved', 'rejected', 'waitlisted', 'withdrawn'
  )),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  change_request_message TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  enrollment_id UUID,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, applicant_email)
);

CREATE INDEX idx_admission_apps_tenant ON admission_applications(tenant_id);
CREATE INDEX idx_admission_apps_form ON admission_applications(form_id);
CREATE INDEX idx_admission_apps_status ON admission_applications(status);
CREATE INDEX idx_admission_apps_token ON admission_applications(access_token);
CREATE INDEX idx_admission_apps_email ON admission_applications(applicant_email);

-- ============================================================================
-- ADMISSION DOCUMENTS
-- ============================================================================

CREATE TABLE public.admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES admission_form_fields(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_docs_tenant ON admission_documents(tenant_id);
CREATE INDEX idx_admission_docs_app ON admission_documents(application_id);

-- ============================================================================
-- ADMISSION REVIEWS
-- ============================================================================

CREATE TABLE public.admission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  application_id UUID NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_reviews_tenant ON admission_reviews(tenant_id);
CREATE INDEX idx_admission_reviews_app ON admission_reviews(application_id);
