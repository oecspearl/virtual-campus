-- ============================================================================
-- Part 33: Supplemental content on shared courses
-- ============================================================================
-- Depends on: 014 (course_shares), 032 (granular share permissions)
-- ============================================================================
-- Lets target tenants attach their own content (announcements, external
-- resource links, later: full lessons) to a shared course — visible only to
-- that tenant's cohort. The source tenant never sees these rows because
-- tenant_id is the TARGET tenant's id.
--
-- Writes are gated by share.can_add_supplemental_content = true (enforced at
-- the API layer). Reads follow the normal pattern: the target tenant's staff
-- manage their supplements; the target tenant's students see them as part of
-- the merged shared-course view.
-- ============================================================================

CREATE TABLE public.shared_course_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- tenant_id = the TARGET tenant. Supplement is scoped to their cohort.

  course_share_id UUID NOT NULL REFERENCES course_shares(id) ON DELETE CASCADE,
  source_course_id UUID NOT NULL,
  -- Denormalised from course_shares.course_id for faster lookups; no FK to
  -- courses since that row lives in another tenant.

  author_id UUID REFERENCES users(id) ON DELETE SET NULL,

  kind VARCHAR(30) NOT NULL
    CHECK (kind IN ('announcement', 'resource_link')),
  -- v1 kinds. 'lesson' will be added later once the authoring flow exists.

  title VARCHAR(500) NOT NULL,
  description TEXT,
  body TEXT,           -- announcements: the message body
  url VARCHAR(1000),   -- resource_link: the link target
  link_type VARCHAR(50),
  icon VARCHAR(100),

  position INTEGER DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_course_supplements_share ON shared_course_supplements(course_share_id);
CREATE INDEX idx_shared_course_supplements_tenant ON shared_course_supplements(tenant_id);
CREATE INDEX idx_shared_course_supplements_source_course ON shared_course_supplements(source_course_id);

DROP TRIGGER IF EXISTS trigger_shared_course_supplements_updated_at ON shared_course_supplements;
CREATE TRIGGER trigger_shared_course_supplements_updated_at
  BEFORE UPDATE ON shared_course_supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE shared_course_supplements ENABLE ROW LEVEL SECURITY;

-- Any user in the target tenant can read published supplements for that tenant.
CREATE POLICY "Tenant members read supplements" ON shared_course_supplements
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

-- Target tenant staff (instructor and above) manage supplements in their tenant.
CREATE POLICY "Target staff manage supplements" ON shared_course_supplements
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );
