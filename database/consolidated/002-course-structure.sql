-- ============================================================================
-- Part 2: Course Structure — Lessons, Classes, Enrollments, Instructors
-- ============================================================================
-- Depends on: 001-foundation-core.sql
-- ============================================================================

-- ============================================================================
-- LESSONS
-- ============================================================================

CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  subject_id UUID REFERENCES subjects(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  learning_outcomes TEXT[],
  lesson_instructions TEXT,
  content JSONB DEFAULT '[]'::jsonb,
  resources JSONB DEFAULT '[]'::jsonb,
  estimated_time INTEGER DEFAULT 0,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  published BOOLEAN DEFAULT false,
  content_type VARCHAR DEFAULT 'rich_text' CHECK (content_type IN ('rich_text', 'video', 'scorm', 'quiz', 'assignment')),
  prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  prerequisite_type VARCHAR(20) DEFAULT 'completion' CHECK (prerequisite_type IN ('completion', 'quiz_pass', 'assignment_pass')),
  prerequisite_min_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_lessons_tenant ON lessons(tenant_id);
CREATE INDEX idx_lessons_subject ON lessons(subject_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_prerequisite ON lessons(prerequisite_lesson_id);

-- ============================================================================
-- COURSE INSTRUCTORS
-- ============================================================================

CREATE TABLE public.course_instructors (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  instructor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_instructors_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_course_instructors_tenant ON course_instructors(tenant_id);
CREATE INDEX idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX idx_course_instructors_instructor ON course_instructors(instructor_id);

-- ============================================================================
-- CLASSES
-- ============================================================================

CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  name VARCHAR NOT NULL,
  section VARCHAR,
  term VARCHAR,
  schedule JSONB DEFAULT '{}'::jsonb,
  max_enrollment INTEGER,
  enrollment_code VARCHAR,
  enrollment_open BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_classes_course ON classes(course_id);
CREATE UNIQUE INDEX idx_classes_enrollment_code ON classes(tenant_id, enrollment_code) WHERE enrollment_code IS NOT NULL;

-- ============================================================================
-- CLASS INSTRUCTORS
-- ============================================================================

CREATE TABLE public.class_instructors (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  instructor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT class_instructors_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_class_instructors_tenant ON class_instructors(tenant_id);
CREATE INDEX idx_class_instructors_class ON class_instructors(class_id);

-- ============================================================================
-- CLASS STUDENTS
-- ============================================================================

CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT class_students_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_class_students_tenant ON class_students(tenant_id);
CREATE INDEX idx_class_students_class ON class_students(class_id);
CREATE INDEX idx_class_students_student ON class_students(student_id);

-- ============================================================================
-- ENROLLMENTS
-- ============================================================================

CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMPTZ,
  student_name VARCHAR,
  student_email VARCHAR,
  student_role VARCHAR,
  student_bio TEXT,
  student_avatar VARCHAR,
  learning_preferences JSONB DEFAULT '{}'::jsonb,
  user_created_at TIMESTAMPTZ,
  profile_created_at TIMESTAMPTZ,
  student_gender VARCHAR,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_tenant ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_tenant_student ON enrollments(tenant_id, student_id);
