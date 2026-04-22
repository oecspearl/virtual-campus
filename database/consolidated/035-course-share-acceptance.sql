-- ============================================================================
-- Part 35: Course share acceptance workflow
-- ============================================================================
-- Depends on: 014 (course_shares), 032 (granular permissions)
-- ============================================================================
-- A shared course no longer lands directly in the target tenant's catalogue
-- the moment the source publishes it. Instead the target tenant's admin must
-- explicitly accept the share. This prevents two problems:
--   (a) Admins being asked to "enrol" in shares as if they were students.
--   (b) Unvetted content appearing in a tenant's catalogue without an
--       authoritative opt-in from that institution.
--
-- Model
--   shared_course_acceptances(course_share_id, accepting_tenant_id) UNIQUE.
--   For targeted shares (course_shares.target_tenant_id = X), the API
--   auto-creates a 'pending' acceptance at share-creation time.
--   For network-wide shares (target_tenant_id IS NULL), a pending row is
--   created lazily the first time a consuming tenant's admin loads their
--   incoming queue.
--
-- Backfill
--   Existing active non-revoked shares are auto-accepted so this migration
--   doesn't break anyone currently consuming a shared course. New shares go
--   through the normal pending -> accepted flow.
-- ============================================================================

CREATE TABLE public.shared_course_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_share_id UUID NOT NULL REFERENCES course_shares(id) ON DELETE CASCADE,
  accepting_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),

  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  declined_by UUID REFERENCES users(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_share_id, accepting_tenant_id)
);

CREATE INDEX idx_sca_share   ON shared_course_acceptances(course_share_id);
CREATE INDEX idx_sca_tenant  ON shared_course_acceptances(accepting_tenant_id);
CREATE INDEX idx_sca_status  ON shared_course_acceptances(accepting_tenant_id, status);

DROP TRIGGER IF EXISTS trigger_shared_course_acceptances_updated_at ON shared_course_acceptances;
CREATE TRIGGER trigger_shared_course_acceptances_updated_at
  BEFORE UPDATE ON shared_course_acceptances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE shared_course_acceptances ENABLE ROW LEVEL SECURITY;

-- The ACCEPTING tenant's users can read their own acceptance decisions.
CREATE POLICY "Accepting tenant reads own acceptances" ON shared_course_acceptances
  FOR SELECT USING (
    accepting_tenant_id = current_tenant_id()
  );

-- The ACCEPTING tenant's staff can create/update their decisions.
CREATE POLICY "Accepting tenant staff manage own acceptances" ON shared_course_acceptances
  FOR ALL USING (
    accepting_tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin')
    )
  );

-- The SOURCE tenant's staff can see acceptance decisions on their shares.
CREATE POLICY "Source tenant reads acceptances of their shares" ON shared_course_acceptances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_shares cs
      WHERE cs.id = shared_course_acceptances.course_share_id
        AND cs.source_tenant_id = current_tenant_id()
    )
  );

-- ── Backfill: auto-accept existing active shares so we don't break callers ──
INSERT INTO shared_course_acceptances (course_share_id, accepting_tenant_id, status, accepted_at)
SELECT
  cs.id,
  cs.target_tenant_id,
  'accepted',
  cs.created_at
FROM course_shares cs
WHERE cs.target_tenant_id IS NOT NULL
  AND cs.revoked_at IS NULL
ON CONFLICT (course_share_id, accepting_tenant_id) DO NOTHING;

-- Network-wide shares don't get backfilled — each consuming tenant will
-- accept (or decline) independently, but existing consumers who have already
-- enrolled will see their course disappear unless they act. So we also
-- backfill acceptances derived from existing cross_tenant_enrollments:
INSERT INTO shared_course_acceptances (course_share_id, accepting_tenant_id, status, accepted_at)
SELECT DISTINCT
  cte.course_share_id,
  cte.tenant_id,
  'accepted',
  MIN(cte.enrolled_at)
FROM cross_tenant_enrollments cte
JOIN course_shares cs ON cs.id = cte.course_share_id
WHERE cs.target_tenant_id IS NULL  -- only for network-wide shares
  AND cs.revoked_at IS NULL
GROUP BY cte.course_share_id, cte.tenant_id
ON CONFLICT (course_share_id, accepting_tenant_id) DO NOTHING;
