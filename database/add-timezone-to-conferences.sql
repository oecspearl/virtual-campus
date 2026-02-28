-- Add timezone column to video_conferences table
-- This allows storing the timezone used when scheduling the conference

ALTER TABLE video_conferences 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York';

-- Create index for timezone if needed
CREATE INDEX IF NOT EXISTS idx_video_conferences_timezone ON video_conferences(timezone);

-- Update existing conferences to have a default timezone
UPDATE video_conferences 
SET timezone = 'America/New_York' 
WHERE timezone IS NULL;

