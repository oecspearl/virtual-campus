-- ============================================================================
-- Part 13: SonisWeb SIS Integration
-- ============================================================================
-- Depends on: 001 (tenants, users), 002 (courses), 003 (course_grades)
-- ============================================================================
-- Tables for integrating with SonisWeb (Jenzabar SONIS) Student Information
-- System via SOAP API. Supports per-tenant configuration, bidirectional
-- ID mapping, field mapping, sync logging, grade passback config, and webhooks.
-- ============================================================================

-- ============================================================================
-- SONISWEB CONNECTIONS — Per-tenant SonisWeb instance configuration
-- ============================================================================

CREATE TABLE public.sonisweb_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  api_username VARCHAR(255) NOT NULL,
  api_password_encrypted TEXT NOT NULL,
  api_mode VARCHAR(20) NOT NULL DEFAULT 'both'
    CHECK (api_mode IN ('soapapi', 'soapsql', 'both')),
  auth_flow VARCHAR(30) NOT NULL DEFAULT 'welcome_email'
    CHECK (auth_flow IN ('welcome_email', 'sso_passthrough')),
  sync_schedule VARCHAR(50) DEFAULT '0 2 * * *',
  sync_enabled BOOLEAN DEFAULT false,
  student_sync_enabled BOOLEAN DEFAULT true,
  enrollment_sync_enabled BOOLEAN DEFAULT true,
  grade_passback_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20)
    CHECK (last_sync_status IN ('success', 'partial', 'failed')),
  connection_status VARCHAR(20) DEFAULT 'pending'
    CHECK (connection_status IN ('pending', 'connected', 'failed', 'disabled')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_sonisweb_connections_tenant ON sonisweb_connections(tenant_id);
CREATE INDEX idx_sonisweb_connections_status ON sonisweb_connections(connection_status);
CREATE INDEX idx_sonisweb_connections_sync ON sonisweb_connections(sync_enabled) WHERE sync_enabled = true;

DROP TRIGGER IF EXISTS trigger_sonisweb_connections_updated_at ON sonisweb_connections;
CREATE TRIGGER trigger_sonisweb_connections_updated_at
  BEFORE UPDATE ON sonisweb_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SONISWEB FIELD MAPPINGS — Configurable field mapping per connection
-- ============================================================================

CREATE TABLE public.sonisweb_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID NOT NULL REFERENCES sonisweb_connections(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL
    CHECK (entity_type IN ('student', 'course', 'programme', 'enrollment', 'grade')),
  sonisweb_field VARCHAR(255) NOT NULL,
  lms_field VARCHAR(255) NOT NULL,
  lms_table VARCHAR(100),
  transform_type VARCHAR(30) DEFAULT 'direct'
    CHECK (transform_type IN ('direct', 'concat', 'map', 'format', 'custom')),
  transform_config JSONB DEFAULT '{}'::jsonb,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, entity_type, sonisweb_field)
);

CREATE INDEX idx_sonisweb_field_mappings_tenant ON sonisweb_field_mappings(tenant_id);
CREATE INDEX idx_sonisweb_field_mappings_connection ON sonisweb_field_mappings(connection_id);
CREATE INDEX idx_sonisweb_field_mappings_entity ON sonisweb_field_mappings(entity_type);

DROP TRIGGER IF EXISTS trigger_sonisweb_field_mappings_updated_at ON sonisweb_field_mappings;
CREATE TRIGGER trigger_sonisweb_field_mappings_updated_at
  BEFORE UPDATE ON sonisweb_field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SONISWEB ID MAPPINGS — Bidirectional ID mapping (SonisWeb <-> LMS)
-- ============================================================================

CREATE TABLE public.sonisweb_id_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID NOT NULL REFERENCES sonisweb_connections(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL
    CHECK (entity_type IN ('user', 'course', 'programme', 'enrollment', 'grade_item', 'grade')),
  sonisweb_id VARCHAR(255) NOT NULL,
  lms_id UUID NOT NULL,
  sonisweb_data JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_direction VARCHAR(10) DEFAULT 'pull'
    CHECK (sync_direction IN ('pull', 'push', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, entity_type, sonisweb_id),
  UNIQUE(connection_id, entity_type, lms_id)
);

CREATE INDEX idx_sonisweb_id_mappings_tenant ON sonisweb_id_mappings(tenant_id);
CREATE INDEX idx_sonisweb_id_mappings_connection ON sonisweb_id_mappings(connection_id);
CREATE INDEX idx_sonisweb_id_mappings_entity ON sonisweb_id_mappings(entity_type);
CREATE INDEX idx_sonisweb_id_mappings_sonisweb_id ON sonisweb_id_mappings(sonisweb_id);
CREATE INDEX idx_sonisweb_id_mappings_lms_id ON sonisweb_id_mappings(lms_id);

DROP TRIGGER IF EXISTS trigger_sonisweb_id_mappings_updated_at ON sonisweb_id_mappings;
CREATE TRIGGER trigger_sonisweb_id_mappings_updated_at
  BEFORE UPDATE ON sonisweb_id_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SONISWEB SYNC LOGS — Sync operation history
-- ============================================================================

CREATE TABLE public.sonisweb_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID NOT NULL REFERENCES sonisweb_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(30) NOT NULL
    CHECK (sync_type IN ('students', 'enrollments', 'grades', 'courses', 'programmes', 'full')),
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'cron', 'webhook')),
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  triggered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sonisweb_sync_logs_tenant ON sonisweb_sync_logs(tenant_id);
CREATE INDEX idx_sonisweb_sync_logs_connection ON sonisweb_sync_logs(connection_id);
CREATE INDEX idx_sonisweb_sync_logs_status ON sonisweb_sync_logs(status);
CREATE INDEX idx_sonisweb_sync_logs_started ON sonisweb_sync_logs(started_at DESC);

DROP TRIGGER IF EXISTS trigger_sonisweb_sync_logs_updated_at ON sonisweb_sync_logs;
CREATE TRIGGER trigger_sonisweb_sync_logs_updated_at
  BEFORE UPDATE ON sonisweb_sync_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SONISWEB GRADE SYNC CONFIG — Per-course grade passback configuration
-- ============================================================================

CREATE TABLE public.sonisweb_grade_sync_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID NOT NULL REFERENCES sonisweb_connections(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  sync_mode VARCHAR(20) DEFAULT 'manual'
    CHECK (sync_mode IN ('manual', 'auto', 'scheduled')),
  grade_format VARCHAR(20) DEFAULT 'percentage'
    CHECK (grade_format IN ('percentage', 'points', 'letter')),
  sonisweb_course_code VARCHAR(255),
  sonisweb_section VARCHAR(100),
  grade_items JSONB DEFAULT '[]'::jsonb,
  last_passback_at TIMESTAMPTZ,
  last_passback_status VARCHAR(20)
    CHECK (last_passback_status IN ('success', 'partial', 'failed')),
  configured_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, course_id)
);

CREATE INDEX idx_sonisweb_grade_sync_config_tenant ON sonisweb_grade_sync_config(tenant_id);
CREATE INDEX idx_sonisweb_grade_sync_config_connection ON sonisweb_grade_sync_config(connection_id);
CREATE INDEX idx_sonisweb_grade_sync_config_course ON sonisweb_grade_sync_config(course_id);

DROP TRIGGER IF EXISTS trigger_sonisweb_grade_sync_config_updated_at ON sonisweb_grade_sync_config;
CREATE TRIGGER trigger_sonisweb_grade_sync_config_updated_at
  BEFORE UPDATE ON sonisweb_grade_sync_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SONISWEB WEBHOOK EVENTS — Inbound webhook event log
-- ============================================================================

CREATE TABLE public.sonisweb_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID REFERENCES sonisweb_connections(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  processing_result JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sonisweb_webhook_events_tenant ON sonisweb_webhook_events(tenant_id);
CREATE INDEX idx_sonisweb_webhook_events_connection ON sonisweb_webhook_events(connection_id);
CREATE INDEX idx_sonisweb_webhook_events_status ON sonisweb_webhook_events(status);
CREATE INDEX idx_sonisweb_webhook_events_created ON sonisweb_webhook_events(created_at DESC);

DROP TRIGGER IF EXISTS trigger_sonisweb_webhook_events_updated_at ON sonisweb_webhook_events;
CREATE TRIGGER trigger_sonisweb_webhook_events_updated_at
  BEFORE UPDATE ON sonisweb_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
