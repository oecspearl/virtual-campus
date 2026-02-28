-- Create site_settings table for CMS branding management
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text', -- 'text', 'json', 'url', 'image'
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Insert default branding settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('site_name', 'OECS MyPD', 'text', 'The main site name/title'),
  ('site_short_name', 'LearnBoard by OECS', 'text', 'Short name for the site'),
  ('logo_url', '/lblogo.png', 'image', 'URL/path to the main logo image'),
  ('logo_header_url', '/Logo.png', 'image', 'URL/path to the header logo image'),
  ('homepage_header_background', '/oecsmypd.png', 'image', 'URL/path to homepage header background image'),
  ('favicon_url', '/favicon.png', 'image', 'URL/path to favicon'),
  ('theme_primary_color', '#3B82F6', 'text', 'Primary theme color (hex)'),
  ('theme_secondary_color', '#6366F1', 'text', 'Secondary theme color (hex)'),
  ('homepage_hero_title', 'The OECS Professional Development Platform', 'text', 'Homepage hero section main title'),
  ('homepage_hero_subtitle', 'Trusted by OECS Professionals', 'text', 'Homepage hero section subtitle')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies (allow read for all authenticated, write only for admins)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read site settings" ON site_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins, super_admins, and curriculum_designers can update settings
CREATE POLICY "Admins can update site settings" ON site_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
    )
  );

-- Only admins, super_admins, and curriculum_designers can insert settings
CREATE POLICY "Admins can insert site settings" ON site_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
CREATE TRIGGER update_site_settings_timestamp
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

