-- Add Google Meet support to video_conferences table
-- This migration adds support for multiple video conferencing providers

-- Add video_provider field to specify which service to use
ALTER TABLE video_conferences 
ADD COLUMN video_provider VARCHAR(20) DEFAULT '8x8vc' CHECK (video_provider IN ('8x8vc', 'google_meet'));

-- Add google_meet_link field to store Google Meet URLs
ALTER TABLE video_conferences 
ADD COLUMN google_meet_link TEXT;

-- Add index for better query performance
CREATE INDEX idx_video_conferences_provider ON video_conferences(video_provider);

-- Update existing conferences to use 8x8vc as default provider
UPDATE video_conferences 
SET video_provider = '8x8vc' 
WHERE video_provider IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN video_conferences.video_provider IS 'Video conferencing provider: 8x8vc or google_meet';
COMMENT ON COLUMN video_conferences.google_meet_link IS 'Google Meet URL for meetings using Google Meet provider';
