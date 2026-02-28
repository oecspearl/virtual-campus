-- Migration: 004-add-i18n-support.sql
-- Description: Add internationalization support to the LMS
-- Created: 2024

-- ============================================================================
-- USER LOCALE PREFERENCES
-- ============================================================================

-- Add locale and timezone preferences to user_profiles
DO $$
BEGIN
    -- Add locale column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'locale') THEN
        ALTER TABLE user_profiles ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
    END IF;

    -- Add timezone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'timezone') THEN
        ALTER TABLE user_profiles ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
    END IF;
END
$$;

-- Also add to users table for quick access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'locale') THEN
        ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'timezone') THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
    END IF;
END
$$;

-- ============================================================================
-- TRANSLATIONS TABLE (for dynamic content)
-- ============================================================================

-- Create translations table for translating dynamic content like course titles, descriptions
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,  -- 'course', 'lesson', 'announcement', 'assignment', etc.
    content_id UUID NOT NULL,            -- ID of the content being translated
    field_name VARCHAR(100) NOT NULL,    -- 'title', 'description', 'instructions', etc.
    locale VARCHAR(10) NOT NULL,         -- 'en', 'es', 'fr', etc.
    translation TEXT NOT NULL,           -- The translated text
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_type, content_id, field_name, locale)
);

-- Create index for efficient translation lookups
CREATE INDEX IF NOT EXISTS idx_translations_content
ON translations(content_type, content_id, locale);

CREATE INDEX IF NOT EXISTS idx_translations_locale
ON translations(locale);

-- Create index for user locale preference lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_locale
ON user_profiles(locale);

CREATE INDEX IF NOT EXISTS idx_users_locale
ON users(locale);

-- ============================================================================
-- SUPPORTED LOCALES TABLE
-- ============================================================================

-- Create table to store supported locales (can be managed by admin)
CREATE TABLE IF NOT EXISTS supported_locales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,     -- 'en', 'es', 'fr'
    name VARCHAR(100) NOT NULL,            -- 'English', 'Spanish', 'French'
    native_name VARCHAR(100) NOT NULL,     -- 'English', 'Español', 'Français'
    is_rtl BOOLEAN DEFAULT false,          -- Right-to-left language
    is_active BOOLEAN DEFAULT true,        -- Whether locale is available to users
    sort_order INTEGER DEFAULT 0,          -- Display order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default locales
INSERT INTO supported_locales (code, name, native_name, is_rtl, is_active, sort_order)
VALUES
    ('en', 'English', 'English', false, true, 1),
    ('es', 'Spanish', 'Español', false, true, 2),
    ('fr', 'French', 'Français', false, true, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    native_name = EXCLUDED.native_name,
    is_rtl = EXCLUDED.is_rtl,
    updated_at = NOW();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on translations table
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read translations
DROP POLICY IF EXISTS "Anyone can read translations" ON translations;
CREATE POLICY "Anyone can read translations"
ON translations FOR SELECT
USING (true);

-- Policy: Admins and instructors can manage translations
DROP POLICY IF EXISTS "Admins and instructors can manage translations" ON translations;
CREATE POLICY "Admins and instructors can manage translations"
ON translations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
);

-- Enable RLS on supported_locales
ALTER TABLE supported_locales ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read supported locales
DROP POLICY IF EXISTS "Anyone can read supported locales" ON supported_locales;
CREATE POLICY "Anyone can read supported locales"
ON supported_locales FOR SELECT
USING (true);

-- Policy: Only admins can manage supported locales
DROP POLICY IF EXISTS "Only admins can manage supported locales" ON supported_locales;
CREATE POLICY "Only admins can manage supported locales"
ON supported_locales FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Function to get translated content with fallback to original
CREATE OR REPLACE FUNCTION get_translation(
    p_content_type VARCHAR,
    p_content_id UUID,
    p_field_name VARCHAR,
    p_locale VARCHAR,
    p_fallback TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_translation TEXT;
BEGIN
    -- Try to get the translation for the requested locale
    SELECT translation INTO v_translation
    FROM translations
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND field_name = p_field_name
      AND locale = p_locale;

    -- If found, return it
    IF v_translation IS NOT NULL THEN
        RETURN v_translation;
    END IF;

    -- If not found, try English as fallback
    IF p_locale != 'en' THEN
        SELECT translation INTO v_translation
        FROM translations
        WHERE content_type = p_content_type
          AND content_id = p_content_id
          AND field_name = p_field_name
          AND locale = 'en';

        IF v_translation IS NOT NULL THEN
            RETURN v_translation;
        END IF;
    END IF;

    -- If still not found, return the provided fallback
    RETURN p_fallback;
END;
$$;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS translations_updated_at ON translations;
CREATE TRIGGER translations_updated_at
    BEFORE UPDATE ON translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

DROP TRIGGER IF EXISTS supported_locales_updated_at ON supported_locales;
CREATE TRIGGER supported_locales_updated_at
    BEFORE UPDATE ON supported_locales
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE translations IS 'Stores translations for dynamic content (courses, lessons, etc.)';
COMMENT ON TABLE supported_locales IS 'Stores the list of supported languages in the system';
COMMENT ON COLUMN translations.content_type IS 'Type of content: course, lesson, announcement, assignment, quiz, etc.';
COMMENT ON COLUMN translations.content_id IS 'UUID of the content item being translated';
COMMENT ON COLUMN translations.field_name IS 'Name of the field being translated: title, description, instructions, etc.';
COMMENT ON COLUMN translations.locale IS 'Language code: en, es, fr, etc.';
COMMENT ON FUNCTION get_translation IS 'Returns translated text with fallback to English, then to provided fallback';
