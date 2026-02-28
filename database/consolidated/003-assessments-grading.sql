-- ============================================================================
-- Part 3: Assessments & Grading — Quizzes, Assignments, Grades
-- ============================================================================
-- Depends on: 001, 002
-- ============================================================================

-- ============================================================================
-- QUIZZES
-- ============================================================================

CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  description TEXT,
  instructions TEXT,
  time_limit INTEGER,
  attempts_allowed INTEGER DEFAULT 1,
  show_correct_answers BOOLEAN DEFAULT false,
  show_feedback VARCHAR DEFAULT 'after_submit' CHECK (show_feedback IN ('immediately', 'after_submit', 'never')),
  randomize_questions BOOLEAN DEFAULT false,
  randomize_answers BOOLEAN DEFAULT false,
  passing_score INTEGER,
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  points INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id),
  proctored_mode VARCHAR DEFAULT 'none' CHECK (proctored_mode IN ('none', 'basic', 'strict')),
  proctor_settings JSONB DEFAULT '{}'::jsonb,
  show_in_curriculum BOOLEAN DEFAULT false,
  curriculum_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT quizzes_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_quizzes_tenant ON quizzes(tenant_id);
CREATE INDEX idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX idx_quizzes_course ON quizzes(course_id);
CREATE INDEX idx_quizzes_creator ON quizzes(creator_id);

-- ============================================================================
-- QUESTIONS
-- ============================================================================

CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  quiz_id UUID REFERENCES quizzes(id),
  type VARCHAR NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching')),
  question_text TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 0,
  options JSONB,
  correct_answer JSONB,
  case_sensitive BOOLEAN DEFAULT false,
  feedback_correct TEXT,
  feedback_incorrect TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT questions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_questions_tenant ON questions(tenant_id);
CREATE INDEX idx_questions_quiz ON questions(quiz_id);

-- ============================================================================
-- QUIZ ATTEMPTS
-- ============================================================================

CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  quiz_id UUID REFERENCES quizzes(id),
  student_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  answers JSONB DEFAULT '[]'::jsonb,
  score INTEGER,
  max_score INTEGER,
  percentage NUMERIC,
  time_taken INTEGER,
  status VARCHAR DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_quiz_attempts_tenant ON quiz_attempts(tenant_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_course ON quiz_attempts(course_id);

-- ============================================================================
-- QUIZ PROCTOR LOGS
-- ============================================================================

CREATE TABLE public.quiz_proctor_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  quiz_attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  severity VARCHAR DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'violation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT quiz_proctor_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_quiz_proctor_logs_tenant ON quiz_proctor_logs(tenant_id);
CREATE INDEX idx_quiz_proctor_logs_attempt ON quiz_proctor_logs(quiz_attempt_id);

-- ============================================================================
-- QUIZ EXTENSIONS
-- ============================================================================

CREATE TABLE public.quiz_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  extended_due_date TIMESTAMPTZ,
  extended_available_until TIMESTAMPTZ,
  extra_time_minutes INTEGER,
  extra_attempts INTEGER,
  reason TEXT,
  granted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);

CREATE INDEX idx_quiz_extensions_tenant ON quiz_extensions(tenant_id);
CREATE INDEX idx_quiz_extensions_quiz ON quiz_extensions(quiz_id);
CREATE INDEX idx_quiz_extensions_student ON quiz_extensions(student_id);
CREATE INDEX idx_quiz_extensions_course ON quiz_extensions(course_id);

-- ============================================================================
-- ASSIGNMENTS
-- ============================================================================

CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID REFERENCES lessons(id),
  class_id UUID REFERENCES classes(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  points INTEGER DEFAULT 100,
  submission_types TEXT[] DEFAULT ARRAY['file'],
  file_types_allowed TEXT[],
  max_file_size INTEGER DEFAULT 50,
  rubric JSONB DEFAULT '[]'::jsonb,
  allow_late_submissions BOOLEAN DEFAULT true,
  late_penalty INTEGER,
  published BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id),
  anonymous_grading BOOLEAN DEFAULT false,
  peer_review_enabled BOOLEAN DEFAULT false,
  peer_reviews_required INTEGER DEFAULT 2,
  peer_review_due_date TIMESTAMPTZ,
  peer_review_rubric JSONB,
  peer_review_anonymous BOOLEAN DEFAULT true,
  is_group_assignment BOOLEAN DEFAULT false,
  group_set_id UUID,
  one_submission_per_group BOOLEAN DEFAULT true,
  show_in_curriculum BOOLEAN DEFAULT false,
  curriculum_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_creator ON assignments(creator_id);
CREATE INDEX idx_assignments_group_set ON assignments(group_set_id) WHERE is_group_assignment = true;

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS
-- ============================================================================

CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  assignment_id UUID REFERENCES assignments(id),
  student_id UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  submission_type VARCHAR NOT NULL CHECK (submission_type IN ('file', 'text', 'url')),
  content TEXT,
  files JSONB,
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
  grade INTEGER,
  feedback TEXT,
  rubric_scores JSONB,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  late BOOLEAN DEFAULT false,
  group_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_assignment_submissions_tenant ON assignment_submissions(tenant_id);
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_group ON assignment_submissions(group_id) WHERE group_id IS NOT NULL;

-- ============================================================================
-- COURSE GRADEBOOK SETTINGS
-- ============================================================================

CREATE TABLE public.course_gradebook_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL UNIQUE REFERENCES courses(id),
  grading_scheme VARCHAR DEFAULT 'points' CHECK (grading_scheme IN ('points', 'percentage', 'letter')),
  categories JSONB DEFAULT '[]'::jsonb,
  total_points INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_gradebook_settings_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_course_gradebook_settings_tenant ON course_gradebook_settings(tenant_id);

-- ============================================================================
-- COURSE GRADE ITEMS
-- ============================================================================

CREATE TABLE public.course_grade_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id),
  title VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('quiz', 'assignment', 'discussion', 'other')),
  category VARCHAR NOT NULL,
  points INTEGER NOT NULL,
  assessment_id UUID,
  due_date TIMESTAMPTZ,
  weight NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_grade_items_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_course_grade_items_tenant ON course_grade_items(tenant_id);
CREATE INDEX idx_course_grade_items_course ON course_grade_items(course_id);

-- ============================================================================
-- COURSE GRADES
-- ============================================================================

CREATE TABLE public.course_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID NOT NULL REFERENCES courses(id),
  student_id UUID NOT NULL REFERENCES users(id),
  grade_item_id UUID NOT NULL REFERENCES course_grade_items(id),
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_grades_pkey PRIMARY KEY (id),
  UNIQUE(student_id, grade_item_id)
);

CREATE INDEX idx_course_grades_tenant ON course_grades(tenant_id);
CREATE INDEX idx_course_grades_course ON course_grades(course_id);
CREATE INDEX idx_course_grades_student ON course_grades(student_id);

-- ============================================================================
-- GRADE ITEMS (Class-level)
-- ============================================================================

CREATE TABLE public.grade_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  title VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('quiz', 'assignment', 'other')),
  category VARCHAR NOT NULL,
  points INTEGER NOT NULL,
  assessment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT grade_items_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_grade_items_tenant ON grade_items(tenant_id);
CREATE INDEX idx_grade_items_class ON grade_items(class_id);

-- ============================================================================
-- GRADES (Class-level)
-- ============================================================================

CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id),
  grade_item_id UUID REFERENCES grade_items(id),
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT grades_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_grades_tenant ON grades(tenant_id);
CREATE INDEX idx_grades_class ON grades(class_id);
CREATE INDEX idx_grades_student ON grades(student_id);

-- ============================================================================
-- LESSON PROGRESS
-- ============================================================================

CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),
  status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_lesson_progress_tenant ON lesson_progress(tenant_id);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- ============================================================================
-- PROGRESS (General)
-- ============================================================================

CREATE TABLE public.progress (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),
  status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT progress_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_progress_tenant ON progress(tenant_id);
CREATE INDEX idx_progress_student ON progress(student_id);
CREATE INDEX idx_progress_lesson ON progress(lesson_id);
CREATE INDEX idx_progress_tenant_student ON progress(tenant_id, student_id);

-- ============================================================================
-- CONTENT ITEM PROGRESS
-- ============================================================================

CREATE TABLE public.content_item_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id, content_index)
);

CREATE INDEX idx_content_item_progress_tenant ON content_item_progress(tenant_id);
CREATE INDEX idx_content_item_progress_student_lesson ON content_item_progress(student_id, lesson_id);
