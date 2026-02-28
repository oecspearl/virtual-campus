-- Migration: 013-add-conference-participants-unique-constraint.sql
-- Description: Add unique constraint on conference_id + user_id to support upsert for attendance tracking

-- First, remove any duplicate entries (keep the most recent one based on joined_at)
DELETE FROM public.conference_participants a
USING public.conference_participants b
WHERE a.id < b.id
  AND a.conference_id = b.conference_id
  AND a.user_id = b.user_id;

-- Add unique constraint
ALTER TABLE public.conference_participants
ADD CONSTRAINT conference_participants_conference_user_unique
UNIQUE (conference_id, user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conference_participants_conference_user
ON public.conference_participants(conference_id, user_id);

-- Add index for attendance queries
CREATE INDEX IF NOT EXISTS idx_conference_participants_joined_at
ON public.conference_participants(joined_at);

COMMENT ON CONSTRAINT conference_participants_conference_user_unique ON public.conference_participants
IS 'Ensures each user can only have one participation record per conference for proper attendance tracking';
