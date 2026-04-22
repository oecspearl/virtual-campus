-- ============================================================================
-- Part 34: Target-tenant live sessions on shared courses
-- ============================================================================
-- Depends on: 014 (course_shares), 032 (granular share permissions)
-- ============================================================================
-- Activates the can_schedule_live_sessions flag from migration 032. Lets a
-- target-tenant instructor schedule live sessions against a shared course —
-- their cohort sees these alongside any sessions the source institution
-- scheduled. The session record lives in the TARGET tenant, so the source
-- tenant never sees it (tenant isolation via RLS).
--
-- v1 is deliberately minimal: an external meeting URL (Zoom/Teams/Meet/etc.)
-- plus schedule + status. Platform-native conferencing (LiveKit, recordings,
-- attendance) is reserved for a follow-up that reuses the existing
-- video_conferences infrastructure.
-- ============================================================================

CREATE TABLE public.shared_course_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- tenant_id = the TARGET tenant. Only that tenant's users see this session.

  course_share_id UUID NOT NULL REFERENCES course_shares(id) ON DELETE CASCADE,
  source_course_id UUID NOT NULL,
  -- Denormalised from course_shares.course_id for faster lookups; no FK since
  -- the course lives in another tenant.

  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- The target-tenant instructor who scheduled the session.

  title VARCHAR(500) NOT NULL,
  description TEXT,

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 600),

  meeting_url VARCHAR(1000),
  provider VARCHAR(30) NOT NULL DEFAULT 'other'
    CHECK (provider IN ('zoom', 'teams', 'meet', 'jitsi', 'other')),

  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_course_live_sessions_share   ON shared_course_live_sessions(course_share_id);
CREATE INDEX idx_shared_course_live_sessions_tenant  ON shared_course_live_sessions(tenant_id);
CREATE INDEX idx_shared_course_live_sessions_sched   ON shared_course_live_sessions(tenant_id, scheduled_at);
CREATE INDEX idx_shared_course_live_sessions_course  ON shared_course_live_sessions(source_course_id);

DROP TRIGGER IF EXISTS trigger_shared_course_live_sessions_updated_at ON shared_course_live_sessions;
CREATE TRIGGER trigger_shared_course_live_sessions_updated_at
  BEFORE UPDATE ON shared_course_live_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE shared_course_live_sessions ENABLE ROW LEVEL SECURITY;

-- Target tenant members read sessions in their own tenant.
CREATE POLICY "Tenant members read live sessions" ON shared_course_live_sessions
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

-- Target tenant staff (instructor and above) manage their sessions.
CREATE POLICY "Target staff manage live sessions" ON shared_course_live_sessions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );
