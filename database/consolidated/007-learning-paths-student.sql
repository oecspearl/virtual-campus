-- ============================================================================
-- Part 7: Learning Paths, Competencies, Adaptive, Student Experience
-- ============================================================================
-- Depends on: 001, 002, 003
-- ============================================================================

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================

CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail VARCHAR(500),
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration VARCHAR(50),
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_paths_tenant ON learning_paths(tenant_id);
CREATE INDEX idx_learning_paths_published ON learning_paths(published, featured);
CREATE INDEX idx_learning_paths_global ON learning_paths(is_global) WHERE is_global = true;

-- ============================================================================
-- LEARNING PATH COURSES
-- ============================================================================

CREATE TABLE public.learning_path_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  unlock_after_previous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learning_path_id, course_id)
);

CREATE INDEX idx_learning_path_courses_tenant ON learning_path_courses(tenant_id);
CREATE INDEX idx_learning_path_courses_path ON learning_path_courses(learning_path_id, "order");

-- ============================================================================
-- LEARNING PATH ENROLLMENTS
-- ============================================================================

CREATE TABLE public.learning_path_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  UNIQUE(learning_path_id, student_id)
);

CREATE INDEX idx_learning_path_enrollments_tenant ON learning_path_enrollments(tenant_id);
CREATE INDEX idx_learning_path_enrollments_student ON learning_path_enrollments(student_id, status);

-- ============================================================================
-- COMPETENCIES
-- ============================================================================

CREATE TABLE public.competencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  parent_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  icon VARCHAR(50),
  color VARCHAR(20),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competencies_tenant ON competencies(tenant_id);
CREATE INDEX idx_competencies_category ON competencies(category);
CREATE INDEX idx_competencies_parent ON competencies(parent_id);
CREATE INDEX idx_competencies_global ON competencies(is_global) WHERE is_global = true;

-- ============================================================================
-- COURSE COMPETENCIES
-- ============================================================================

CREATE TABLE public.course_competencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  is_primary BOOLEAN DEFAULT false,
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, competency_id)
);

CREATE INDEX idx_course_competencies_tenant ON course_competencies(tenant_id);
CREATE INDEX idx_course_competencies_course ON course_competencies(course_id);

-- ============================================================================
-- LESSON COMPETENCIES
-- ============================================================================

CREATE TABLE public.lesson_competencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, competency_id)
);

CREATE INDEX idx_lesson_competencies_tenant ON lesson_competencies(tenant_id);

-- ============================================================================
-- STUDENT COMPETENCIES
-- ============================================================================

CREATE TABLE public.student_competencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
  current_level DECIMAL(3,2) DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 5),
  evidence JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, competency_id)
);

CREATE INDEX idx_student_competencies_tenant ON student_competencies(tenant_id);
CREATE INDEX idx_student_competencies_student ON student_competencies(student_id);

-- ============================================================================
-- ADAPTIVE RULES
-- ============================================================================

CREATE TABLE public.adaptive_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  condition_type VARCHAR(50) NOT NULL,
  condition_value JSONB NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_target UUID,
  action_data JSONB,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_adaptive_rules_tenant ON adaptive_rules(tenant_id);
CREATE INDEX idx_adaptive_rules_quiz ON adaptive_rules(quiz_id);
CREATE INDEX idx_adaptive_rules_course ON adaptive_rules(course_id);

-- ============================================================================
-- STUDENT ADAPTIVE RECOMMENDATIONS
-- ============================================================================

CREATE TABLE public.student_adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES adaptive_rules(id) ON DELETE SET NULL,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  recommendation_type VARCHAR(50) NOT NULL,
  target_id UUID,
  target_title VARCHAR(255),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acted_at TIMESTAMPTZ
);

CREATE INDEX idx_student_adaptive_recs_tenant ON student_adaptive_recommendations(tenant_id);
CREATE INDEX idx_student_adaptive_recs_student ON student_adaptive_recommendations(student_id, status);

-- ============================================================================
-- STUDENT NOTES
-- ============================================================================

CREATE TABLE public.student_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_position JSONB,
  highlight_color VARCHAR(20) DEFAULT 'yellow',
  is_private BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_notes_tenant ON student_notes(tenant_id);
CREATE INDEX idx_student_notes_student ON student_notes(student_id);
CREATE INDEX idx_student_notes_lesson ON student_notes(student_id, lesson_id);
CREATE INDEX idx_student_notes_tags ON student_notes USING GIN(tags);

-- ============================================================================
-- STUDENT BOOKMARKS
-- ============================================================================

CREATE TABLE public.student_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookmark_type VARCHAR(50) NOT NULL,
  bookmark_id UUID NOT NULL,
  folder VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, bookmark_type, bookmark_id)
);

CREATE INDEX idx_student_bookmarks_tenant ON student_bookmarks(tenant_id);
CREATE INDEX idx_student_bookmarks_student ON student_bookmarks(student_id);

-- ============================================================================
-- STUDENT CALENDAR EVENTS
-- ============================================================================

CREATE TABLE public.student_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  source_type VARCHAR(50),
  source_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  reminder_minutes INTEGER[],
  recurrence_rule TEXT,
  color VARCHAR(20),
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_tenant ON student_calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_student ON student_calendar_events(student_id);
CREATE INDEX idx_calendar_events_date ON student_calendar_events(student_id, start_datetime);

-- ============================================================================
-- STUDENT TODOS
-- ============================================================================

CREATE TABLE public.student_todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50),
  source_id UUID,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_todos_tenant ON student_todos(tenant_id);
CREATE INDEX idx_student_todos_student ON student_todos(student_id);
CREATE INDEX idx_student_todos_status ON student_todos(student_id, status);
CREATE INDEX idx_student_todos_due ON student_todos(student_id, due_date);

-- ============================================================================
-- STUDY GROUPS
-- ============================================================================

CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  join_code VARCHAR(20) UNIQUE,
  avatar_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_groups_tenant ON study_groups(tenant_id);
CREATE INDEX idx_study_groups_course ON study_groups(course_id);
CREATE INDEX idx_study_groups_creator ON study_groups(created_by);

-- ============================================================================
-- STUDY GROUP MEMBERS
-- ============================================================================

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  nickname VARCHAR(100),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  UNIQUE(group_id, student_id)
);

CREATE INDEX idx_study_group_members_tenant ON study_group_members(tenant_id);
CREATE INDEX idx_study_group_members_group ON study_group_members(group_id);
CREATE INDEX idx_study_group_members_student ON study_group_members(student_id);

-- ============================================================================
-- STUDY GROUP MESSAGES
-- ============================================================================

CREATE TABLE public.study_group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachment_url VARCHAR(500),
  attachment_name VARCHAR(255),
  reply_to_id UUID REFERENCES study_group_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_group_messages_tenant ON study_group_messages(tenant_id);
CREATE INDEX idx_study_group_messages_group ON study_group_messages(group_id, created_at DESC);

-- ============================================================================
-- STUDY GROUP EVENTS
-- ============================================================================

CREATE TABLE public.study_group_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_group_events_tenant ON study_group_events(tenant_id);
CREATE INDEX idx_study_group_events_group ON study_group_events(group_id, start_datetime);

-- ============================================================================
-- STUDENT STUDY SESSIONS
-- ============================================================================

CREATE TABLE public.student_study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  focus_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_tenant ON student_study_sessions(tenant_id);
CREATE INDEX idx_study_sessions_student ON student_study_sessions(student_id, start_time DESC);
