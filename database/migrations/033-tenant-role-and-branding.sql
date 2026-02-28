-- ============================================================================
-- Migration 033: Tenant Admin Role + Branding Seed Trigger
-- ============================================================================

-- 1. Update users table role CHECK constraint to include tenant_admin
-- ============================================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'tenant_admin', 'admin', 'instructor',
                    'curriculum_designer', 'student', 'parent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also update tenant_memberships role constraint (already includes tenant_admin from 030)
-- Just ensure it's consistent
ALTER TABLE tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_role_check;
DO $$ BEGIN
  ALTER TABLE tenant_memberships ADD CONSTRAINT tenant_memberships_role_check
    CHECK (role IN ('super_admin', 'tenant_admin', 'admin', 'instructor',
                    'curriculum_designer', 'student', 'parent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Auto-seed branding settings when a new tenant is created
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy all site_settings from the default tenant to the new tenant
  INSERT INTO site_settings (tenant_id, setting_key, setting_value, setting_type, description)
  SELECT
    NEW.id,
    s.setting_key,
    s.setting_value,
    s.setting_type,
    s.description
  FROM site_settings s
  WHERE s.tenant_id = '00000000-0000-0000-0000-000000000001'
  ON CONFLICT (tenant_id, setting_key) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_tenant_insert_seed_settings ON tenants;
CREATE TRIGGER after_tenant_insert_seed_settings
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION seed_tenant_settings();
