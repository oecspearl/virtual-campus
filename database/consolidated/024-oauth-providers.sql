-- ============================================================================
-- Part 24: OAuth / OIDC Provider Configuration
-- ============================================================================
-- Depends on: 001 (tenants, users)
-- ============================================================================
-- Per-tenant OAuth 2.0 / OpenID Connect provider configuration.
-- Supports Azure AD, Google, and generic OIDC providers.
-- Client secrets are encrypted at rest using AES-256-GCM
-- (same mechanism as sonisweb_connections.api_password_encrypted).
-- ============================================================================

CREATE TABLE public.oauth_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',

  -- Provider identity
  provider_type VARCHAR(30) NOT NULL
    CHECK (provider_type IN ('azure_ad', 'google', 'generic_oidc')),
  display_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT false,

  -- OAuth credentials
  client_id VARCHAR(500) NOT NULL,
  client_secret_encrypted TEXT NOT NULL,

  -- Provider-specific configuration
  -- Azure AD: the Azure AD directory (tenant) ID or domain
  -- Generic OIDC: the issuer URL
  provider_tenant_id VARCHAR(500),
  authorization_url VARCHAR(1000),
  token_url VARCHAR(1000),
  userinfo_url VARCHAR(1000),
  scopes VARCHAR(500) DEFAULT 'openid email profile',

  -- Behaviour
  auto_provision_users BOOLEAN DEFAULT true,
  default_role VARCHAR(30) DEFAULT 'student',
  email_domain_restriction VARCHAR(500),

  -- Login button customisation
  button_label VARCHAR(100),
  button_icon VARCHAR(100),
  sort_order INTEGER DEFAULT 0,

  -- Status tracking
  last_used_at TIMESTAMPTZ,
  connection_status VARCHAR(20) DEFAULT 'pending'
    CHECK (connection_status IN ('pending', 'connected', 'failed', 'disabled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, provider_type)
);

CREATE INDEX idx_oauth_providers_tenant ON oauth_providers(tenant_id);
CREATE INDEX idx_oauth_providers_enabled ON oauth_providers(tenant_id, enabled) WHERE enabled = true;

DROP TRIGGER IF EXISTS trigger_oauth_providers_updated_at ON oauth_providers;
CREATE TRIGGER trigger_oauth_providers_updated_at
  BEFORE UPDATE ON oauth_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE oauth_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_providers_tenant_read ON oauth_providers
  FOR SELECT USING (
    tenant_id = COALESCE(
      NULLIF(current_setting('app.tenant_id', true), ''),
      '00000000-0000-0000-0000-000000000001'
    )::uuid
  );

CREATE POLICY oauth_providers_tenant_write ON oauth_providers
  FOR ALL USING (
    tenant_id = COALESCE(
      NULLIF(current_setting('app.tenant_id', true), ''),
      '00000000-0000-0000-0000-000000000001'
    )::uuid
  );
