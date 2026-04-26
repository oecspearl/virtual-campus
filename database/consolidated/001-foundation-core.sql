-- ============================================================================
-- Part 1: Foundation — Extensions, Tenants, Core Tables, Helper Functions
-- ============================================================================
-- Run this FIRST. All other migration files depend on these tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANTS (must be first — all other tables reference tenants)
-- ============================================================================

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'trial', 'deactivated')),
  settings JSONB DEFAULT '{}'::jsonb,
  plan VARCHAR(50) DEFAULT 'standard',
  max_users INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), '')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent')),
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  gender VARCHAR CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  student_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_locale ON users(locale);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_users_student_id ON users(tenant_id, student_id);

-- ============================================================================
-- TENANT MEMBERSHIPS
-- ============================================================================

CREATE TABLE public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'student'
    CHECK (role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_role ON tenant_memberships(role);
CREATE INDEX idx_tenant_memberships_primary ON tenant_memberships(user_id, is_primary) WHERE is_primary = true;

DROP TRIGGER IF EXISTS trigger_tenant_memberships_updated_at ON tenant_memberships;
CREATE TRIGGER trigger_tenant_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COURSES
-- ============================================================================

CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail VARCHAR,
  grade_level VARCHAR,
  subject_area VARCHAR,
  difficulty VARCHAR DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  syllabus TEXT,
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  ceu_credits NUMERIC DEFAULT 0,
  credit_type VARCHAR DEFAULT 'CEU',
  -- Preferred values: self_paced | blended | instructor_led. Legacy
  -- values online and in_person are still accepted for backwards
  -- compatibility (see migration 038-course-modality-expand.sql).
  modality VARCHAR DEFAULT 'self_paced' CHECK (modality IN ('self_paced', 'blended', 'instructor_led', 'online', 'in_person')),
  estimated_duration VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_published ON courses(published);
CREATE INDEX idx_courses_tenant_published ON courses(tenant_id, published);

-- ============================================================================
-- SUBJECTS (Course Modules/Units)
-- ============================================================================

CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  course_id UUID REFERENCES courses(id),
  title VARCHAR NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  estimated_duration VARCHAR,
  learning_objectives TEXT[],
  published BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_subjects_tenant ON subjects(tenant_id);
CREATE INDEX idx_subjects_course ON subjects(course_id);
CREATE INDEX idx_subjects_global ON subjects(is_global) WHERE is_global = true;

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID UNIQUE REFERENCES users(id),
  bio TEXT,
  avatar VARCHAR,
  learning_preferences JSONB DEFAULT '{}'::jsonb,
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_locale ON user_profiles(locale);

-- ============================================================================
-- SITE SETTINGS (tenant-scoped)
-- ============================================================================

CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  setting_key VARCHAR NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR DEFAULT 'text',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  UNIQUE(tenant_id, setting_key)
);

CREATE INDEX idx_site_settings_tenant ON site_settings(tenant_id);
CREATE INDEX idx_site_settings_tenant_key ON site_settings(tenant_id, setting_key);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
  setting_key VARCHAR NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_system_settings_tenant ON system_settings(tenant_id);

-- ============================================================================
-- SEED DEFAULT TENANT
-- ============================================================================

INSERT INTO tenants (id, name, slug, status, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default', 'active', 'standard')
ON CONFLICT (id) DO NOTHING;
