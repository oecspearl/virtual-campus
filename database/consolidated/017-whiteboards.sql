-- ============================================================================
-- Part 17: Whiteboards (Collaborative Jamboard-style boards)
-- ============================================================================
-- Depends on: 001 (tenants, users), 002 (courses), 004 (video_conferences, lessons)
-- ============================================================================

-- ============================================================================
-- WHITEBOARDS — Standalone board entities with independent lifecycle
-- ============================================================================

CREATE TABLE public.whiteboards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',

  -- Ownership
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata
  title TEXT NOT NULL DEFAULT 'Untitled Board',
  description TEXT,
  thumbnail_url TEXT,

  -- Board state (Excalidraw-compatible JSON)
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  app_state JSONB DEFAULT '{}'::jsonb,

  -- Frames (multi-page support — like Jamboard's "frames")
  frames JSONB DEFAULT '[]'::jsonb,

  -- Scope
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'course', 'shared', 'public')),

  -- Optional linking — a board can exist standalone or be tied to a context
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,

  -- Collaboration settings
  collaboration TEXT NOT NULL DEFAULT 'collaborate'
    CHECK (collaboration IN ('view_only', 'comment_only', 'collaborate')),

  -- Lifecycle
  is_template BOOLEAN DEFAULT FALSE,
  auto_snapshot BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT whiteboards_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_whiteboards_tenant ON whiteboards(tenant_id);
CREATE INDEX idx_whiteboards_created_by ON whiteboards(created_by);
CREATE INDEX idx_whiteboards_course ON whiteboards(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_whiteboards_template ON whiteboards(created_by, is_template) WHERE is_template = TRUE;
CREATE INDEX idx_whiteboards_visibility ON whiteboards(visibility) WHERE visibility != 'private';

ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WHITEBOARD VERSIONS — Point-in-time snapshots for history/recovery
-- ============================================================================

CREATE TABLE public.whiteboard_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,

  -- Who saved this version and why
  saved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,

  -- Full snapshot of board state at this point
  elements JSONB NOT NULL,
  app_state JSONB,
  frames JSONB,

  -- Auto-generated thumbnail for version browser
  thumbnail_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT whiteboard_versions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_wb_versions_board ON whiteboard_versions(whiteboard_id, created_at DESC);

ALTER TABLE whiteboard_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONFERENCE WHITEBOARDS — Links boards to video conferences (many-to-many)
-- ============================================================================

CREATE TABLE public.conference_whiteboards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',

  conference_id UUID NOT NULL REFERENCES video_conferences(id) ON DELETE CASCADE,
  whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,

  -- Who attached it
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Per-conference settings (override the board's default)
  collaboration TEXT NOT NULL DEFAULT 'collaborate'
    CHECK (collaboration IN ('view_only', 'comment_only', 'collaborate')),

  -- When should the board be accessible?
  available_from TEXT NOT NULL DEFAULT 'on_join'
    CHECK (available_from IN ('on_join', 'on_activate', 'after_session')),

  -- State tracking
  is_active BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT conference_whiteboards_pkey PRIMARY KEY (id),
  CONSTRAINT conference_whiteboards_unique UNIQUE (conference_id, whiteboard_id)
);

CREATE INDEX idx_conf_wb_conference ON conference_whiteboards(conference_id);
CREATE INDEX idx_conf_wb_whiteboard ON conference_whiteboards(whiteboard_id);

ALTER TABLE conference_whiteboards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Whiteboards: owner can do anything, course members can view course-scoped boards
CREATE POLICY whiteboards_select ON whiteboards FOR SELECT
  USING (
    created_by = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'shared' AND tenant_id = (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    ))
    OR (visibility = 'course' AND course_id IN (
      SELECT course_id FROM enrollments WHERE student_id = auth.uid()
      UNION
      SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
    ))
  );

CREATE POLICY whiteboards_insert ON whiteboards FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY whiteboards_update ON whiteboards FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY whiteboards_delete ON whiteboards FOR DELETE
  USING (created_by = auth.uid());

-- Whiteboard versions: accessible if you can see the parent whiteboard
CREATE POLICY wb_versions_select ON whiteboard_versions FOR SELECT
  USING (
    whiteboard_id IN (SELECT id FROM whiteboards)
  );

CREATE POLICY wb_versions_insert ON whiteboard_versions FOR INSERT
  WITH CHECK (
    whiteboard_id IN (SELECT id FROM whiteboards WHERE created_by = auth.uid())
  );

-- Conference whiteboards: accessible if you can see the conference
CREATE POLICY conf_wb_select ON conference_whiteboards FOR SELECT
  USING (
    conference_id IN (
      SELECT id FROM video_conferences
    )
  );

CREATE POLICY conf_wb_insert ON conference_whiteboards FOR INSERT
  WITH CHECK (added_by = auth.uid());

CREATE POLICY conf_wb_update ON conference_whiteboards FOR UPDATE
  USING (added_by = auth.uid());

CREATE POLICY conf_wb_delete ON conference_whiteboards FOR DELETE
  USING (added_by = auth.uid());

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_whiteboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whiteboards_updated_at
  BEFORE UPDATE ON whiteboards
  FOR EACH ROW EXECUTE FUNCTION update_whiteboards_updated_at();
