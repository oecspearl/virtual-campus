-- ============================================================================
-- Migration 030: Multi-Tenancy Foundation
-- ============================================================================
-- Creates the core tenants infrastructure:
--   1. tenants table
--   2. tenant_memberships table (many-to-many users <-> tenants)
--   3. Helper SQL functions for RLS tenant context
--   4. Default tenant + backfill existing users
-- ============================================================================

-- 1. Core tenants table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
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

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 2. User-tenant membership (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'student'
    CHECK (role IN ('super_admin', 'tenant_admin', 'admin', 'instructor',
                    'curriculum_designer', 'student', 'parent')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_role ON tenant_memberships(role);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_primary ON tenant_memberships(user_id, is_primary) WHERE is_primary = true;

-- 3. Helper SQL functions
-- ============================================================================

-- Returns the current tenant ID from the Postgres session variable.
-- Falls back to the default tenant if not set.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), '')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Sets the tenant context for the current database session.
-- Called by the application before executing RLS-protected queries.
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on tenants
CREATE OR REPLACE FUNCTION update_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_updated_at();

DROP TRIGGER IF EXISTS trigger_tenant_memberships_updated_at ON tenant_memberships;
CREATE TRIGGER trigger_tenant_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_updated_at();

-- 4. RLS on tenants and tenant_memberships
-- ============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Tenants: members can read their own tenant
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
CREATE POLICY "Users can view their tenants" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid())
  );

-- Tenants: super admins can manage all tenants
DROP POLICY IF EXISTS "Super admins manage tenants" ON tenants;
CREATE POLICY "Super admins manage tenants" ON tenants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Memberships: users see their own memberships
DROP POLICY IF EXISTS "Users see own memberships" ON tenant_memberships;
CREATE POLICY "Users see own memberships" ON tenant_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Memberships: tenant admins/admins can manage memberships for their tenant
DROP POLICY IF EXISTS "Tenant admins manage memberships" ON tenant_memberships;
CREATE POLICY "Tenant admins manage memberships" ON tenant_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = tenant_memberships.tenant_id
        AND tm.role IN ('tenant_admin', 'admin', 'super_admin')
    )
  );

-- 5. Grants
-- ============================================================================
GRANT ALL ON tenants TO service_role;
GRANT ALL ON tenant_memberships TO service_role;
GRANT SELECT ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tenant_memberships TO authenticated;

-- 6. Seed default tenant
-- ============================================================================
INSERT INTO tenants (id, name, slug, status, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default', 'active', 'standard')
ON CONFLICT (id) DO NOTHING;

-- 7. Backfill all existing users into default tenant
-- ============================================================================
INSERT INTO tenant_memberships (tenant_id, user_id, role, is_primary)
SELECT
  '00000000-0000-0000-0000-000000000001',
  u.id,
  u.role,
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_memberships tm
  WHERE tm.user_id = u.id
    AND tm.tenant_id = '00000000-0000-0000-0000-000000000001'
);
