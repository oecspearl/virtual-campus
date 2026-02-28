-- ============================================================================
-- Notification Channels Configuration
-- ============================================================================
-- This script sets up notification channels for SMS, WhatsApp, and Push notifications
-- Run this after setting up your API keys and credentials
-- ============================================================================

-- ============================================================================
-- SMS Channel Configuration (Twilio)
-- ============================================================================
-- Replace the placeholder values with your actual Twilio credentials
-- Get these from: https://console.twilio.com/

INSERT INTO public.notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active,
  rate_limit_per_minute
) VALUES (
  'sms',
  'twilio',
  'YOUR_TWILIO_ACCOUNT_SID',
  'YOUR_TWILIO_AUTH_TOKEN',
  '{
    "from_number": "+1XXXXXXXXXX",
    "webhook_url": "https://oecsmypd.org/api/notifications/sms/webhook",
    "status_callback": "https://oecsmypd.org/api/notifications/sms/status"
  }'::jsonb,
  true,
  60
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  updated_at = now();

-- ============================================================================
-- WhatsApp Channel Configuration (Twilio WhatsApp Business API)
-- ============================================================================
-- Twilio also provides WhatsApp Business API
-- Get these from: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

INSERT INTO public.notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active,
  rate_limit_per_minute
) VALUES (
  'whatsapp',
  'twilio',
  'YOUR_TWILIO_ACCOUNT_SID',
  'YOUR_TWILIO_AUTH_TOKEN',
  '{
    "from_number": "whatsapp:+1XXXXXXXXXX",
    "webhook_url": "https://oecsmypd.org/api/notifications/whatsapp/webhook",
    "status_callback": "https://oecsmypd.org/api/notifications/whatsapp/status",
    "template_approval_required": true
  }'::jsonb,
  true,
  30
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  updated_at = now();

-- Alternative: WhatsApp Business API via Meta (Facebook)
-- Uncomment and configure if using Meta's WhatsApp Business API instead
/*
INSERT INTO public.notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active,
  rate_limit_per_minute
) VALUES (
  'whatsapp',
  'meta',
  'YOUR_META_ACCESS_TOKEN',
  'YOUR_META_APP_SECRET',
  '{
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID",
    "api_version": "v18.0",
    "webhook_verify_token": "YOUR_WEBHOOK_VERIFY_TOKEN"
  }'::jsonb,
  true,
  30
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  updated_at = now();
*/

-- ============================================================================
-- Push Notification Channel Configuration (Firebase Cloud Messaging)
-- ============================================================================
-- Get these from: https://console.firebase.google.com/

INSERT INTO public.notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active,
  rate_limit_per_minute
) VALUES (
  'push',
  'firebase',
  'YOUR_FIREBASE_SERVER_KEY',
  'YOUR_FIREBASE_SERVICE_ACCOUNT_JSON',
  '{
    "project_id": "your-project-id",
    "api_url": "https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send",
    "v1_api": true,
    "android_package_name": "com.yourcompany.yourapp",
    "ios_bundle_id": "com.yourcompany.yourapp",
    "web_push_public_key": "YOUR_WEB_PUSH_PUBLIC_KEY"
  }'::jsonb,
  true,
  1000
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  updated_at = now();

-- ============================================================================
-- View Current Channel Configurations
-- ============================================================================

-- View all notification channels (without sensitive data)
SELECT 
  id,
  channel_type,
  provider,
  is_active,
  rate_limit_per_minute,
  configuration->>'from_number' as from_number,
  configuration->>'project_id' as project_id,
  created_at,
  updated_at
FROM public.notification_channels
ORDER BY channel_type;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. SMS (Twilio):
--    - Sign up at https://www.twilio.com/
--    - Get Account SID and Auth Token from dashboard
--    - Purchase a phone number or use trial number
--    - Update the from_number in configuration
--
-- 2. WhatsApp (Twilio):
--    - Use same Twilio account
--    - Enable WhatsApp in Twilio Console
--    - Use sandbox number for testing: whatsapp:+14155238886
--    - For production, get approved WhatsApp Business number
--
-- 3. WhatsApp (Meta):
--    - Set up WhatsApp Business Account
--    - Create Meta App and get access token
--    - Configure webhook for message status
--
-- 4. Push (Firebase):
--    - Create Firebase project at https://console.firebase.google.com/
--    - Enable Cloud Messaging
--    - Get Server Key (Legacy) or Service Account JSON
--    - Configure Android/iOS apps
--    - For web, set up VAPID keys
--
-- 5. Security:
--    - Store API keys securely (consider encryption)
--    - Use environment variables in production
--    - Rotate keys regularly
--    - Monitor usage and set up alerts

