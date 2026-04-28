-- ============================================================================
-- Part 40: User OAuth identity links
-- ============================================================================
-- Depends on: 001 (users, tenants), 024 (oauth_providers)
-- ============================================================================
-- Stores the (provider, subject) pair returned by an external OAuth/OIDC
-- identity provider so we can match a returning user back to their LMS user
-- record without relying on email alone.
--
-- Why this is needed:
--   The OAuth callback used to look up users by lowercased email only. That
--   makes account takeover trivial if a tenant disables email_domain_restriction
--   and an attacker registers an IdP account for an email that already exists
--   in our system. Storing the IdP-issued `sub` claim per (provider, user)
--   pins the account to a specific external identity.
--
-- Lookup strategy on subsequent logins:
--   1. (provider_type, provider_subject) unique  -> user_id
--   2. fallback: lowercased email                -> existing user; link identity
--   3. fallback: auto_provision_users=true       -> create user + link identity
--
-- Note: provider_subject is the OIDC `sub` claim (Azure may also expose `oid`
-- as a stable per-tenant directory object id). We store whichever the
-- provider library returns as `sub`.
-- ============================================================================

CREATE TABLE public.user_oauth_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',

  provider_type VARCHAR(30) NOT NULL
    CHECK (provider_type IN ('azure_ad', 'google', 'generic_oidc')),
  -- The OIDC `sub` claim from the IdP. Stable per-user, per-provider.
  provider_subject VARCHAR(500) NOT NULL,

  -- Email at the time of last successful login via this identity.
  -- Kept for diagnostics; the source of truth is users.email.
  email VARCHAR(255),

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One LMS user can only be linked to a given (provider, subject) pair once,
  -- and a given (provider, subject) can only be linked to one user.
  UNIQUE (provider_type, provider_subject),
  UNIQUE (user_id, provider_type)
);

CREATE INDEX idx_user_oauth_identities_user ON user_oauth_identities(user_id);
CREATE INDEX idx_user_oauth_identities_tenant ON user_oauth_identities(tenant_id);
CREATE INDEX idx_user_oauth_identities_lookup
  ON user_oauth_identities(provider_type, provider_subject);

DROP TRIGGER IF EXISTS trigger_user_oauth_identities_updated_at ON user_oauth_identities;
CREATE TRIGGER trigger_user_oauth_identities_updated_at
  BEFORE UPDATE ON user_oauth_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies. The OAuth callback writes via the service-role client so RLS
-- is bypassed there; these policies cover surfaces where users or admins
-- might inspect their own linked identities.
ALTER TABLE user_oauth_identities ENABLE ROW LEVEL SECURITY;

-- A user can read their own linked identities.
CREATE POLICY user_oauth_identities_self_read ON user_oauth_identities
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Tenant admins can read identities scoped to their tenant.
CREATE POLICY user_oauth_identities_tenant_read ON user_oauth_identities
  FOR SELECT USING (
    tenant_id = COALESCE(
      NULLIF(current_setting('app.tenant_id', true), ''),
      '00000000-0000-0000-0000-000000000001'
    )::uuid
  );
