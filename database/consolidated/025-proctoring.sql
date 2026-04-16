-- ============================================================================
-- Part 25: Proctoring Services, Sessions & Events
-- ============================================================================
-- Depends on: 001 (tenants, users), 002 (courses), 003 (quizzes, assignments)
-- ============================================================================

-- ============================================================================
-- PROCTORING_SERVICES — Third-party proctoring integrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proctoring_services (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',

  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('browser_lock', 'remote_proctoring', 'ai_proctoring', 'hybrid')),

  api_endpoint TEXT,
  api_key TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT proctoring_services_pkey PRIMARY KEY (id),
  CONSTRAINT proctoring_services_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_proctoring_services_tenant ON proctoring_services(tenant_id);

-- ============================================================================
-- PROCTORING_SESSIONS — Individual proctored exam sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proctoring_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',

  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  quiz_id UUID,
  assignment_id UUID,

  session_type TEXT NOT NULL CHECK (session_type IN ('browser_lock', 'remote_proctoring', 'ai_proctoring', 'hybrid')),
  proctoring_service TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'flagged', 'violated', 'cancelled')),

  -- Browser lock settings
  browser_lock_enabled BOOLEAN DEFAULT FALSE,
  prevent_copy_paste BOOLEAN DEFAULT TRUE,
  prevent_new_tabs BOOLEAN DEFAULT TRUE,
  prevent_printing BOOLEAN DEFAULT TRUE,
  prevent_screen_capture BOOLEAN DEFAULT TRUE,
  require_fullscreen BOOLEAN DEFAULT FALSE,
  allow_switching_tabs BOOLEAN DEFAULT FALSE,
  max_tab_switches INTEGER DEFAULT 0,

  -- Remote proctoring settings
  require_webcam BOOLEAN DEFAULT FALSE,
  require_microphone BOOLEAN DEFAULT FALSE,
  require_screen_share BOOLEAN DEFAULT FALSE,
  ai_monitoring BOOLEAN DEFAULT FALSE,
  human_review BOOLEAN DEFAULT FALSE,

  -- Session tracking
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  violation_count INTEGER DEFAULT 0,
  violations JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT proctoring_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_tenant ON proctoring_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_student ON proctoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_quiz ON proctoring_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_status ON proctoring_sessions(status);

-- ============================================================================
-- PROCTORING_EVENTS — Audit trail for proctoring events/violations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proctoring_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',

  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}'::jsonb,
  auto_flagged BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT proctoring_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_proctoring_events_session ON proctoring_events(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_severity ON proctoring_events(severity);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE proctoring_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_events ENABLE ROW LEVEL SECURITY;

-- Proctoring services: admins can manage, authenticated can read active ones
CREATE POLICY "proctoring_services_select" ON proctoring_services
  FOR SELECT USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_services_insert" ON proctoring_services
  FOR INSERT WITH CHECK (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_services_update" ON proctoring_services
  FOR UPDATE USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_services_delete" ON proctoring_services
  FOR DELETE USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

-- Proctoring sessions: tenant-scoped
CREATE POLICY "proctoring_sessions_select" ON proctoring_sessions
  FOR SELECT USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_sessions_insert" ON proctoring_sessions
  FOR INSERT WITH CHECK (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_sessions_update" ON proctoring_sessions
  FOR UPDATE USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

-- Proctoring events: tenant-scoped
CREATE POLICY "proctoring_events_select" ON proctoring_events
  FOR SELECT USING (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY "proctoring_events_insert" ON proctoring_events
  FOR INSERT WITH CHECK (
    tenant_id = COALESCE(
      current_setting('app.current_tenant_id', true)::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
  );
