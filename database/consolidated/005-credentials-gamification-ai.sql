-- ============================================================================
-- Part 5: Badges, Certificates, Gamification, Transcripts, AI Tutor
-- ============================================================================
-- Depends on: 001, 002
-- ============================================================================

-- ============================================================================
-- BADGES
-- ============================================================================

CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  criteria_url TEXT,
  issuer_name VARCHAR NOT NULL DEFAULT 'OECS Learning Hub',
  issuer_url TEXT,
  issuer_email TEXT,
  badge_class_id VARCHAR,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_badges_tenant ON badges(tenant_id);

-- ============================================================================
-- USER BADGES
-- ============================================================================

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES users(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  course_id UUID REFERENCES courses(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_url TEXT,
  badge_assertion JSONB,
  verification_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_user_badges_tenant ON user_badges(tenant_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- ============================================================================
-- CERTIFICATE TEMPLATES
-- ============================================================================

CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR NOT NULL,
  description TEXT,
  template_html TEXT NOT NULL,
  background_image_url TEXT,
  logo_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  variables JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_templates_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_certificate_templates_tenant ON certificate_templates(tenant_id);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================

CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  template_id UUID REFERENCES certificate_templates(id),
  verification_code VARCHAR NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  grade_percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificates_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_certificates_tenant ON certificates(tenant_id);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- ============================================================================
-- CEU CREDITS
-- ============================================================================

CREATE TABLE public.ceu_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  credits NUMERIC NOT NULL,
  credit_type VARCHAR NOT NULL DEFAULT 'CEU',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_id UUID REFERENCES certificates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ceu_credits_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_ceu_credits_tenant ON ceu_credits(tenant_id);
CREATE INDEX idx_ceu_credits_student ON ceu_credits(student_id);

-- ============================================================================
-- GAMIFICATION PROFILES
-- ============================================================================

CREATE TABLE public.gamification_profiles (
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  xp_total BIGINT NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamification_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT gamification_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_gamification_profiles_tenant ON gamification_profiles(tenant_id);

-- ============================================================================
-- GAMIFICATION XP LEDGER
-- ============================================================================

CREATE TABLE public.gamification_xp_ledger (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_id TEXT,
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES lessons(id),
  xp_delta INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamification_xp_ledger_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_gamification_xp_ledger_tenant ON gamification_xp_ledger(tenant_id);
CREATE INDEX idx_gamification_xp_ledger_user ON gamification_xp_ledger(user_id);

-- ============================================================================
-- TRANSCRIPTS
-- ============================================================================

CREATE TABLE public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT,
  course_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_credits NUMERIC DEFAULT 0,
  gpa NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_transcripts_tenant ON transcripts(tenant_id);
CREATE INDEX idx_transcripts_student ON transcripts(student_id);

-- ============================================================================
-- AI TUTOR PREFERENCES
-- ============================================================================

CREATE TABLE public.ai_tutor_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL UNIQUE REFERENCES users(id),
  is_enabled BOOLEAN DEFAULT true,
  preferred_style VARCHAR DEFAULT 'balanced' CHECK (preferred_style IN ('simple', 'detailed', 'balanced')),
  learning_focus VARCHAR DEFAULT 'general',
  auto_activate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_tutor_preferences_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_ai_tutor_preferences_tenant ON ai_tutor_preferences(tenant_id);

-- ============================================================================
-- AI TUTOR CONVERSATIONS
-- ============================================================================

CREATE TABLE public.ai_tutor_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSONB,
  response_type VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_tutor_conversations_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_ai_tutor_conversations_tenant ON ai_tutor_conversations(tenant_id);
CREATE INDEX idx_ai_tutor_conversations_student ON ai_tutor_conversations(student_id);

-- ============================================================================
-- AI TUTOR ANALYTICS
-- ============================================================================

CREATE TABLE public.ai_tutor_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  student_id UUID NOT NULL REFERENCES users(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  interaction_count INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  concepts_explained INTEGER DEFAULT 0,
  examples_requested INTEGER DEFAULT 0,
  help_requests INTEGER DEFAULT 0,
  practice_requests INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_tutor_analytics_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_ai_tutor_analytics_tenant ON ai_tutor_analytics(tenant_id);
CREATE INDEX idx_ai_tutor_analytics_student ON ai_tutor_analytics(student_id);
