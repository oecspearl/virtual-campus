-- ============================================================================
-- LTI Tool Consumer Schema
-- ============================================================================
-- This schema enables the LMS to be launched as an LTI Tool from external
-- platforms (Canvas, Blackboard, Moodle, etc.)
-- ============================================================================

-- LTI External Platforms
-- Stores external platforms that can launch this LMS as an LTI tool
CREATE TABLE IF NOT EXISTS public.lti_external_platforms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  issuer character varying NOT NULL UNIQUE, -- Platform issuer URL
  client_id character varying NOT NULL, -- Our client_id on their platform
  deployment_id character varying, -- Deployment ID on their platform
  authorization_server text NOT NULL, -- OAuth authorization server URL
  token_endpoint text NOT NULL, -- OAuth token endpoint
  jwks_uri text NOT NULL, -- JWKS URL to fetch platform's public keys
  platform_public_key text, -- Cached public key (optional, prefer JWKS)
  launch_url text NOT NULL, -- Our launch URL on their platform
  status character varying DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  auto_provision_users boolean DEFAULT true, -- Auto-create users from LTI claims
  default_user_role character varying DEFAULT 'student', -- Default role for provisioned users
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT lti_external_platforms_pkey PRIMARY KEY (id),
  CONSTRAINT lti_external_platforms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- LTI Tool Launches (from external platforms)
-- Tracks launches received from external platforms
CREATE TABLE IF NOT EXISTS public.lti_tool_launches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  platform_id uuid NOT NULL,
  user_id uuid, -- May be null if user not yet provisioned
  lti_user_id character varying, -- LTI sub claim (user ID from platform)
  email character varying,
  name character varying,
  roles text[], -- LTI roles from platform
  context_id character varying, -- Course/context ID from platform
  context_title character varying,
  context_label character varying,
  resource_link_id character varying,
  resource_link_title character varying,
  message_type character varying DEFAULT 'LtiResourceLinkRequest',
  version character varying DEFAULT '1.3.0',
  nonce character varying NOT NULL UNIQUE,
  launch_presentation_return_url text,
  custom_parameters jsonb DEFAULT '{}'::jsonb,
  launch_data jsonb DEFAULT '{}'::jsonb, -- Full JWT claims
  redirect_url text, -- Where to redirect after authentication
  session_token text, -- Temporary session token
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_tool_launches_pkey PRIMARY KEY (id),
  CONSTRAINT lti_tool_launches_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.lti_external_platforms(id) ON DELETE CASCADE,
  CONSTRAINT lti_tool_launches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- LTI Platform Public Keys Cache
-- Caches public keys fetched from platform JWKS URLs
CREATE TABLE IF NOT EXISTS public.lti_platform_keys_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  platform_id uuid NOT NULL,
  kid character varying NOT NULL, -- Key ID
  public_key text NOT NULL, -- PEM format public key
  algorithm character varying DEFAULT 'RS256',
  expires_at timestamp with time zone, -- When to refresh (if JWKS has expiration)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lti_platform_keys_cache_pkey PRIMARY KEY (id),
  CONSTRAINT lti_platform_keys_cache_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.lti_external_platforms(id) ON DELETE CASCADE,
  CONSTRAINT lti_platform_keys_cache_unique UNIQUE (platform_id, kid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lti_external_platforms_issuer ON public.lti_external_platforms(issuer);
CREATE INDEX IF NOT EXISTS idx_lti_external_platforms_client_id ON public.lti_external_platforms(client_id);
CREATE INDEX IF NOT EXISTS idx_lti_external_platforms_status ON public.lti_external_platforms(status);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_platform_id ON public.lti_tool_launches(platform_id);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_user_id ON public.lti_tool_launches(user_id);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_lti_user_id ON public.lti_tool_launches(lti_user_id);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_nonce ON public.lti_tool_launches(nonce);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_session_token ON public.lti_tool_launches(session_token);
CREATE INDEX IF NOT EXISTS idx_lti_tool_launches_expires_at ON public.lti_tool_launches(expires_at);
CREATE INDEX IF NOT EXISTS idx_lti_platform_keys_cache_platform_id ON public.lti_platform_keys_cache(platform_id);
CREATE INDEX IF NOT EXISTS idx_lti_platform_keys_cache_kid ON public.lti_platform_keys_cache(kid);

-- Row Level Security
ALTER TABLE public.lti_external_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_tool_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lti_platform_keys_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS lti_external_platforms_admin_all ON public.lti_external_platforms;
DROP POLICY IF EXISTS lti_tool_launches_user_access ON public.lti_tool_launches;
DROP POLICY IF EXISTS lti_platform_keys_cache_service_only ON public.lti_platform_keys_cache;

-- Admins can manage platforms
CREATE POLICY lti_external_platforms_admin_all ON public.lti_external_platforms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Users can view their own launches
CREATE POLICY lti_tool_launches_user_access ON public.lti_tool_launches
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Only service role can access keys cache
CREATE POLICY lti_platform_keys_cache_service_only ON public.lti_platform_keys_cache
  FOR ALL USING (false); -- Only accessible via service role

-- Triggers
-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_lti_external_platforms_updated_at ON public.lti_external_platforms;
DROP TRIGGER IF EXISTS update_lti_platform_keys_cache_updated_at ON public.lti_platform_keys_cache;

CREATE TRIGGER update_lti_external_platforms_updated_at 
  BEFORE UPDATE ON public.lti_external_platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lti_platform_keys_cache_updated_at 
  BEFORE UPDATE ON public.lti_platform_keys_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

