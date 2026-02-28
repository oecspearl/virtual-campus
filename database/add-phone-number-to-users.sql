-- Add phone_number column to users table
-- This enables users to receive SMS and WhatsApp notifications

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number character varying(20);

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number) WHERE phone_number IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.users.phone_number IS 'User phone number for SMS/WhatsApp notifications. Include country code (e.g., +1234567890)';
