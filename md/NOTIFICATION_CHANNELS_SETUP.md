# Notification Channels Setup Guide

This guide walks you through setting up SMS, WhatsApp, and Push notification channels.

## 📱 SMS Setup (Twilio)

### Step 1: Create Twilio Account

1. Sign up at https://www.twilio.com/
2. Verify your email and phone number
3. Complete account setup

### Step 2: Get Credentials

1. Go to Twilio Console: https://console.twilio.com/
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values (keep them secure!)

### Step 3: Get Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number (or use trial number for testing)
3. Copy the phone number (format: +1234567890)

### Step 4: Configure in Database

Run the SQL script:

```sql
-- Edit database/configure-notification-channels.sql
-- Replace placeholders with your actual values
-- Then run in Supabase SQL Editor
```

Or manually update:

```sql
UPDATE public.notification_channels
SET 
  api_key = 'YOUR_ACCOUNT_SID',
  api_secret = 'YOUR_AUTH_TOKEN',
  configuration = jsonb_set(
    configuration,
    '{from_number}',
    '"YOUR_PHONE_NUMBER"'
  )
WHERE channel_type = 'sms';
```

### Step 5: Test SMS

```typescript
// Test via API
POST /api/notifications/omnichannel
{
  "user_id": "user-id",
  "type": "test",
  "title": "Test SMS",
  "message": "This is a test message",
  "channels": {
    "sms": true
  }
}
```

## 💬 WhatsApp Setup (Twilio)

### Option A: Twilio WhatsApp Business API

1. **Enable WhatsApp in Twilio:**
   - Go to Twilio Console → **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Follow setup instructions
   - Use sandbox number: `whatsapp:+14155238886` (for testing)

2. **Get Production Number:**
   - Apply for WhatsApp Business number
   - Wait for approval (can take days/weeks)
   - Once approved, use your business number

3. **Configure:**
   ```sql
   UPDATE public.notification_channels
   SET 
     api_key = 'YOUR_ACCOUNT_SID',
     api_secret = 'YOUR_AUTH_TOKEN',
     configuration = jsonb_set(
       configuration,
       '{from_number}',
       '"whatsapp:+14155238886"'  -- Sandbox or your business number
     )
   WHERE channel_type = 'whatsapp';
   ```

### Option B: Meta WhatsApp Business API

1. **Create Meta Business Account:**
   - Go to https://business.facebook.com/
   - Create business account

2. **Set up WhatsApp Business:**
   - Go to https://business.facebook.com/wa/manage/
   - Create WhatsApp Business Account
   - Get phone number approved

3. **Create Meta App:**
   - Go to https://developers.facebook.com/
   - Create app → Select "Business" type
   - Add WhatsApp product
   - Get **Access Token** and **App Secret**

4. **Configure:**
   ```sql
   INSERT INTO public.notification_channels (
     channel_type,
     provider,
     api_key,
     api_secret,
     configuration
   ) VALUES (
     'whatsapp',
     'meta',
     'YOUR_ACCESS_TOKEN',
     'YOUR_APP_SECRET',
     '{
       "phone_number_id": "YOUR_PHONE_NUMBER_ID",
       "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID",
       "api_version": "v18.0"
     }'::jsonb
   );
   ```

## 🔔 Push Notifications Setup (Firebase)

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **Add project**
3. Enter project name and follow setup wizard
4. Enable **Google Analytics** (optional)

### Step 2: Enable Cloud Messaging

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Enable **Cloud Messaging API (Legacy)**
3. Copy **Server key** (Legacy) - you'll need this

### Step 3: Get Service Account (Recommended)

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Download JSON file (keep it secure!)
4. Copy the JSON content

### Step 4: Configure Web Push (for web apps)

1. Install Firebase SDK:
   ```bash
   npm install firebase
   ```

2. Get VAPID keys:
   ```bash
   # In Firebase Console → Project Settings → Cloud Messaging
   # Generate Web Push certificates
   ```

3. Configure in your app:
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getMessaging, getToken } from 'firebase/messaging';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   const messaging = getMessaging(app);
   ```

### Step 5: Configure in Database

```sql
UPDATE public.notification_channels
SET 
  api_key = 'YOUR_SERVER_KEY',  -- Legacy server key
  api_secret = 'YOUR_SERVICE_ACCOUNT_JSON',  -- Encrypted JSON
  configuration = jsonb_set(
    jsonb_set(
      configuration,
      '{project_id}',
      '"YOUR_PROJECT_ID"'
    ),
    '{web_push_public_key}',
    '"YOUR_VAPID_PUBLIC_KEY"'
  )
WHERE channel_type = 'push';
```

### Step 6: Register Device Tokens

When users enable push notifications, store their tokens:

```typescript
// In your app
const token = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_PUBLIC_KEY'
});

// Save to user preferences
await fetch('/api/notifications/preferences', {
  method: 'PUT',
  body: JSON.stringify({
    push_tokens: [{
      token: token,
      platform: 'web',  // or 'ios', 'android'
      created_at: new Date().toISOString()
    }]
  })
});
```

## 🔐 Security Best Practices

### 1. Encrypt Sensitive Data

In production, encrypt API keys and secrets:

```typescript
// Use encryption library
import crypto from 'crypto';

function encrypt(text: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### 2. Use Environment Variables

Store credentials in `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
FIREBASE_SERVER_KEY=your_server_key
FIREBASE_SERVICE_ACCOUNT=your_service_account_json
```

### 3. Rotate Credentials

- Change API keys regularly (every 90 days)
- Monitor usage for suspicious activity
- Revoke compromised keys immediately

### 4. Rate Limiting

Configure rate limits in `notification_channels`:

```sql
UPDATE public.notification_channels
SET rate_limit_per_minute = 60  -- Adjust based on your plan
WHERE channel_type = 'sms';
```

## 🧪 Testing

### Test SMS

```bash
curl -X POST http://localhost:3000/api/notifications/omnichannel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user-id",
    "type": "test",
    "title": "Test SMS",
    "message": "Hello from Twilio!",
    "channels": {
      "sms": true
    }
  }'
```

### Test WhatsApp

```bash
curl -X POST http://localhost:3000/api/notifications/omnichannel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user-id",
    "type": "test",
    "title": "Test WhatsApp",
    "message": "Hello from WhatsApp!",
    "channels": {
      "whatsapp": true
    }
  }'
```

### Test Push

```bash
curl -X POST http://localhost:3000/api/notifications/omnichannel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user-id",
    "type": "test",
    "title": "Test Push",
    "message": "Hello from Firebase!",
    "channels": {
      "push": true
    }
  }'
```

## 📊 Monitoring

### View Channel Status

```sql
SELECT 
  channel_type,
  provider,
  is_active,
  rate_limit_per_minute,
  updated_at
FROM public.notification_channels;
```

### View Notification Logs

```sql
-- SMS notifications
SELECT 
  id,
  user_id,
  phone_number,
  status,
  sent_at,
  delivered_at
FROM public.sms_notifications
ORDER BY created_at DESC
LIMIT 100;

-- Push notifications
SELECT 
  id,
  user_id,
  platform,
  status,
  sent_at,
  delivered_at
FROM public.push_notifications
ORDER BY created_at DESC
LIMIT 100;
```

## 🐛 Troubleshooting

### SMS Not Sending

1. Check Twilio account balance
2. Verify phone number format (+1234567890)
3. Check rate limits
4. Review Twilio logs in console

### WhatsApp Not Working

1. Verify sandbox setup (for testing)
2. Check message template approval (for production)
3. Verify phone number is approved
4. Review Meta/Twilio logs

### Push Notifications Not Received

1. Verify device token is registered
2. Check Firebase project configuration
3. Verify app is properly configured
4. Check browser/device permissions
5. Review Firebase console logs

## 📚 Resources

- **Twilio Docs:** https://www.twilio.com/docs
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp
- **Firebase Cloud Messaging:** https://firebase.google.com/docs/cloud-messaging
- **Web Push:** https://web.dev/push-notifications-overview/

