-- Migration: 005-add-accessibility-tables.sql
-- Description: Add accessibility support tables for WCAG 2.1 AA compliance
-- Created: 2024

-- ============================================================================
-- ACCESSIBILITY REPORTS TABLE
-- ============================================================================

-- Store accessibility audit reports for content
CREATE TABLE IF NOT EXISTS accessibility_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,     -- 'lesson', 'course', 'announcement', 'page'
    content_id UUID NOT NULL,               -- ID of the content being audited
    issues JSONB NOT NULL DEFAULT '[]',     -- Array of accessibility issues found
    score INTEGER CHECK (score >= 0 AND score <= 100),  -- Accessibility score 0-100
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_by UUID REFERENCES users(id),
    UNIQUE(content_type, content_id)
);

-- Create index for report lookups
CREATE INDEX IF NOT EXISTS idx_accessibility_reports_content
ON accessibility_reports(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_accessibility_reports_score
ON accessibility_reports(score);

-- ============================================================================
-- VIDEO CAPTIONS TABLE
-- ============================================================================

-- Store video caption/subtitle tracks
CREATE TABLE IF NOT EXISTS video_captions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_url TEXT NOT NULL,                -- URL of the video
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'en',  -- Language code
    label VARCHAR(100),                     -- Display label (e.g., "English", "Spanish")
    caption_format VARCHAR(20) NOT NULL DEFAULT 'vtt',  -- 'vtt', 'srt'
    caption_url TEXT NOT NULL,              -- URL to caption file
    caption_content TEXT,                   -- Inline caption content (alternative to URL)
    auto_generated BOOLEAN DEFAULT false,   -- If captions were auto-generated
    is_default BOOLEAN DEFAULT false,       -- Default caption track
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(video_url, language)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_captions_video ON video_captions(video_url);
CREATE INDEX IF NOT EXISTS idx_video_captions_lesson ON video_captions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_captions_language ON video_captions(language);

-- ============================================================================
-- ACCESSIBILITY PREFERENCES TABLE
-- ============================================================================

-- Store user accessibility preferences
CREATE TABLE IF NOT EXISTS accessibility_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    high_contrast BOOLEAN DEFAULT false,
    reduce_motion BOOLEAN DEFAULT false,
    large_text BOOLEAN DEFAULT false,
    screen_reader_optimized BOOLEAN DEFAULT false,
    captions_enabled BOOLEAN DEFAULT true,
    caption_language VARCHAR(10) DEFAULT 'en',
    caption_font_size VARCHAR(20) DEFAULT 'medium',  -- 'small', 'medium', 'large', 'xlarge'
    caption_background VARCHAR(20) DEFAULT 'black',  -- 'black', 'white', 'transparent'
    keyboard_shortcuts_enabled BOOLEAN DEFAULT true,
    focus_indicators_enhanced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accessibility_prefs_user ON accessibility_preferences(user_id);

-- ============================================================================
-- ACCESSIBILITY ISSUE TYPES (Reference)
-- ============================================================================

-- Document the structure of issues stored in accessibility_reports.issues JSONB
-- Each issue follows this structure:
-- {
--   "id": "unique-issue-id",
--   "type": "error" | "warning" | "info",
--   "rule": "WCAG rule identifier (e.g., 'img-alt', 'color-contrast')",
--   "element": "CSS selector or description of element",
--   "message": "Human-readable description of the issue",
--   "fix": "Suggested fix for the issue",
--   "wcag": "WCAG criterion (e.g., '1.1.1', '1.4.3')"
-- }

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on accessibility_reports
ALTER TABLE accessibility_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can read accessibility reports
DROP POLICY IF EXISTS "Anyone can read accessibility reports" ON accessibility_reports;
CREATE POLICY "Anyone can read accessibility reports"
ON accessibility_reports FOR SELECT
USING (true);

-- Admins and instructors can manage accessibility reports
DROP POLICY IF EXISTS "Admins can manage accessibility reports" ON accessibility_reports;
CREATE POLICY "Admins can manage accessibility reports"
ON accessibility_reports FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
);

-- Enable RLS on video_captions
ALTER TABLE video_captions ENABLE ROW LEVEL SECURITY;

-- Anyone can read video captions
DROP POLICY IF EXISTS "Anyone can read video captions" ON video_captions;
CREATE POLICY "Anyone can read video captions"
ON video_captions FOR SELECT
USING (true);

-- Admins and instructors can manage captions
DROP POLICY IF EXISTS "Admins can manage video captions" ON video_captions;
CREATE POLICY "Admins can manage video captions"
ON video_captions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
);

-- Enable RLS on accessibility_preferences
ALTER TABLE accessibility_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS "Users can read own accessibility preferences" ON accessibility_preferences;
CREATE POLICY "Users can read own accessibility preferences"
ON accessibility_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own preferences
DROP POLICY IF EXISTS "Users can manage own accessibility preferences" ON accessibility_preferences;
CREATE POLICY "Users can manage own accessibility preferences"
ON accessibility_preferences FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update the updated_at timestamp for video_captions
DROP TRIGGER IF EXISTS video_captions_updated_at ON video_captions;
CREATE TRIGGER video_captions_updated_at
    BEFORE UPDATE ON video_captions
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- Trigger for accessibility_preferences
DROP TRIGGER IF EXISTS accessibility_prefs_updated_at ON accessibility_preferences;
CREATE TRIGGER accessibility_prefs_updated_at
    BEFORE UPDATE ON accessibility_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get accessibility score for content
CREATE OR REPLACE FUNCTION get_accessibility_score(
    p_content_type VARCHAR,
    p_content_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT score INTO v_score
    FROM accessibility_reports
    WHERE content_type = p_content_type
      AND content_id = p_content_id;

    RETURN COALESCE(v_score, -1);  -- Return -1 if not checked
END;
$$;

-- Function to get caption tracks for a video
CREATE OR REPLACE FUNCTION get_video_captions(p_video_url TEXT)
RETURNS TABLE (
    id UUID,
    language VARCHAR(10),
    label VARCHAR(100),
    caption_url TEXT,
    is_default BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vc.id,
        vc.language,
        vc.label,
        vc.caption_url,
        vc.is_default
    FROM video_captions vc
    WHERE vc.video_url = p_video_url
    ORDER BY vc.is_default DESC, vc.language ASC;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE accessibility_reports IS 'Stores accessibility audit results for content';
COMMENT ON TABLE video_captions IS 'Stores video caption/subtitle tracks for accessibility';
COMMENT ON TABLE accessibility_preferences IS 'Stores user accessibility preferences';
COMMENT ON COLUMN accessibility_reports.issues IS 'JSON array of accessibility issues found during audit';
COMMENT ON COLUMN accessibility_reports.score IS 'Accessibility score from 0-100';
COMMENT ON COLUMN video_captions.caption_format IS 'Caption file format: vtt (WebVTT) or srt (SubRip)';
COMMENT ON COLUMN video_captions.auto_generated IS 'Whether captions were auto-generated vs manually created';
