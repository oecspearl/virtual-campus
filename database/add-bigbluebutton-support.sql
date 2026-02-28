-- Add BigBlueButton support to video_conferences table

-- Update the check constraint for video_provider if it exists, or just document that we support 'bigbluebutton'
-- Since we can't easily modify a check constraint in a single line without knowing its name, 
-- we will just ensure the column exists and has the right type if we were using an enum.
-- But based on the schema I saw, video_provider wasn't explicitly created with a CHECK constraint in the CREATE TABLE.
-- It was likely added later or I missed it. 
-- However, to be safe, we will add a check constraint if we want to enforce it, 
-- or just assume the application logic handles it.

-- Let's check if the column exists first, if not add it.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_conferences' AND column_name = 'video_provider') THEN
        ALTER TABLE video_conferences ADD COLUMN video_provider VARCHAR(50) DEFAULT '8x8vc';
    END IF;
END $$;

-- Drop existing check constraint if it exists to allow new values
-- We need to find the constraint name first or just try to drop it if we know the standard naming convention
-- Usually postgres names it video_conferences_video_provider_check
ALTER TABLE video_conferences DROP CONSTRAINT IF EXISTS video_conferences_video_provider_check;

-- Add updated check constraint
ALTER TABLE video_conferences ADD CONSTRAINT video_conferences_video_provider_check 
    CHECK (video_provider IN ('8x8vc', 'google_meet', 'bigbluebutton'));

-- Add bbb_meeting_id column just in case we need a specific ID format different from meeting_id
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS bbb_meeting_id VARCHAR(255);

-- Add bbb_attendee_pw and bbb_moderator_pw for BBB specific security
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS bbb_attendee_pw VARCHAR(50);
ALTER TABLE video_conferences ADD COLUMN IF NOT EXISTS bbb_moderator_pw VARCHAR(50);
