-- Update default logo and brand name for existing installations
-- Run this script to update the default logo and site short name

-- Update logo URL if it's still the old default
UPDATE site_settings 
SET setting_value = '/lblogo.png',
    updated_at = NOW()
WHERE setting_key = 'logo_url' 
  AND setting_value = '/mypdlogo.png';

-- Update site short name if it's still the old default
UPDATE site_settings 
SET setting_value = 'LearnBoard by OECS',
    updated_at = NOW()
WHERE setting_key = 'site_short_name' 
  AND setting_value = 'MyPD';

-- Insert new defaults if they don't exist (for fresh installations)
INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('site_short_name', 'LearnBoard by OECS', 'text', 'Short name for the site'),
  ('logo_url', '/lblogo.png', 'image', 'URL/path to the main logo image')
ON CONFLICT (setting_key) DO NOTHING;

