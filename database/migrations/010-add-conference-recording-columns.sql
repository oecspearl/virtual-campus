-- Migration: 010-add-conference-recording-columns.sql
-- Add missing columns to conference_recordings table for recording management feature

-- Add title column
ALTER TABLE public.conference_recordings
ADD COLUMN IF NOT EXISTS title character varying(255);

-- Add status column with default value
ALTER TABLE public.conference_recordings
ADD COLUMN IF NOT EXISTS status character varying(20) DEFAULT 'available'
CHECK (status IN ('processing', 'available', 'failed', 'deleted'));

-- Add added_by column to track who uploaded the recording
ALTER TABLE public.conference_recordings
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES public.users(id);

-- Add updated_at column for tracking modifications
ALTER TABLE public.conference_recordings
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conference_recordings_conference_id
ON public.conference_recordings(conference_id);

CREATE INDEX IF NOT EXISTS idx_conference_recordings_status
ON public.conference_recordings(status);

-- Comment on columns
COMMENT ON COLUMN public.conference_recordings.title IS 'Optional title for the recording';
COMMENT ON COLUMN public.conference_recordings.status IS 'Recording status: processing, available, failed, deleted';
COMMENT ON COLUMN public.conference_recordings.added_by IS 'User who added/uploaded the recording';
