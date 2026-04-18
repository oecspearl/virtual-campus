# How to Send WhatsApp Messages

This guide shows you how to send WhatsApp messages through the LMS system.

## 📋 Prerequisites

1. **Configure WhatsApp Channel** - Set up Twilio or Meta WhatsApp Business API
2. **User Phone Number** - Users must have phone numbers in their profile
3. **User Preferences** - Users must enable WhatsApp notifications

## 🚀 Quick Start

### Method 1: Via API (Recommended)

```bash
curl -X POST https://your-domain.vercel.app/api/notifications/omnichannel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "user-uuid",
    "type": "assignment_due",
    "title": "Assignment Reminder",
    "message": "Your assignment is due tomorrow!",
    "channels": {
      "whatsapp": true
    }
  }'
```

### Method 2: Via Code

```typescript
import { sendOmnichannelNotification } from '@/lib/notifications/omnichannel';

await sendOmnichannelNotification({
  userId: 'user-id',
  type: 'assignment_due',
  title: 'Assignment Reminder',
  message: 'Your assignment is due tomorrow!',
  channels: {
    whatsapp: true,
    email: false,
    sms: false,
    push: false,
    in_app: true, // Optional
  },
  priority: 'high',
});
```

## ⚙️ Setup Steps

### Step 1: Configure WhatsApp Channel

#### Option A: Twilio WhatsApp (Easier)

1. **Sign up for Twilio:** https://www.twilio.com/
2. **Enable WhatsApp:**
   - Go to Twilio Console → **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Follow setup instructions
   - Use sandbox number for testing: `whatsapp:+14155238886`

3. **Configure in Database:**

```sql
-- Run in Supabase SQL Editor
INSERT INTO notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active
) VALUES (
  'whatsapp',
  'twilio',
  'YOUR_TWILIO_ACCOUNT_SID',
  'YOUR_TWILIO_AUTH_TOKEN',
  '{
    "from_number": "whatsapp:+14155238886"
  }'::jsonb,
  true
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active;
```

#### Option B: Meta WhatsApp Business API

1. **Create Meta Business Account:** https://business.facebook.com/
2. **Set up WhatsApp Business:** https://business.facebook.com/wa/manage/
3. **Get API Credentials:**
   - Go to https://developers.facebook.com/
   - Create app → Add WhatsApp product
   - Get Access Token and App Secret

4. **Configure in Database:**

```sql
INSERT INTO notification_channels (
  channel_type,
  provider,
  api_key,
  api_secret,
  configuration,
  is_active
) VALUES (
  'whatsapp',
  'meta',
  'YOUR_META_ACCESS_TOKEN',
  'YOUR_META_APP_SECRET',
  '{
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID",
    "api_version": "v18.0"
  }'::jsonb,
  true
) ON CONFLICT (channel_type) DO UPDATE SET
  provider = EXCLUDED.provider,
  api_key = EXCLUDED.api_key,
  api_secret = EXCLUDED.api_secret,
  configuration = EXCLUDED.configuration,
  is_active = EXCLUDED.is_active;
```

### Step 2: Enable WhatsApp for Users

Users need to:
1. Have a phone number in their profile
2. Enable WhatsApp in notification preferences

**Update User Phone Number:**

```sql
-- Add phone number to user
UPDATE users
SET phone_number = '+1234567890'
WHERE id = 'user-id';
```

**Enable WhatsApp for User:**

```sql
-- Enable WhatsApp notifications
UPDATE notification_preferences
SET 
  whatsapp_enabled = true,
  whatsapp_number = '+1234567890'
WHERE user_id = 'user-id';
```

Or via API:

```typescript
// Update user preferences
await fetch('/api/notifications/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    whatsapp_enabled: true,
    whatsapp_number: '+1234567890',
  }),
});
```

## 📱 Sending WhatsApp Messages

### Example 1: Assignment Due Reminder

```typescript
await sendOmnichannelNotification({
  userId: studentId,
  type: 'assignment_due',
  title: 'Assignment Due Soon',
  message: `Hi ${studentName}, your assignment "${assignmentTitle}" is due in 24 hours. Don't forget to submit it!`,
  linkUrl: `/assignments/${assignmentId}`,
  channels: {
    whatsapp: true,
    email: true, // Also send email
    in_app: true,
  },
  priority: 'high',
});
```

### Example 2: Grade Posted

```typescript
await sendOmnichannelNotification({
  userId: studentId,
  type: 'grade_posted',
  title: 'New Grade Available',
  message: `Your grade for "${assignmentTitle}" has been posted. You scored ${score}/${maxScore}.`,
  linkUrl: `/assignments/${assignmentId}`,
  channels: {
    whatsapp: true,
  },
});
```

### Example 3: Course Announcement

```typescript
await sendOmnichannelNotification({
  userId: studentId,
  type: 'course_announcement',
  title: 'New Course Announcement',
  message: `New announcement in ${courseName}: ${announcementText}`,
  linkUrl: `/course/${courseId}/announcements`,
  channels: {
    whatsapp: true,
    email: true,
  },
});
```

## 🔧 Complete Integration Example

To actually send WhatsApp messages (currently it only logs), you need to integrate with the provider:

### For Twilio WhatsApp:

Update `lib/notifications/omnichannel.ts`:

```typescript
async function sendWhatsApp(userId: string, phoneNumber: string, message: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  
  // Get WhatsApp channel configuration
  const { data: channel } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('channel_type', 'whatsapp')
    .eq('is_active', true)
    .single();
  
  if (!channel) {
    throw new Error('WhatsApp channel not configured');
  }
  
  // Create WhatsApp notification record
  const { data: notification } = await supabase
    .from('whatsapp_notifications')
    .insert({
      user_id: userId,
      phone_number: phoneNumber,
      message,
      status: 'pending',
    })
    .select()
    .single();
  
  // Send via Twilio
  if (channel.provider === 'twilio') {
    const twilio = require('twilio');
    const client = twilio(channel.api_key, channel.api_secret);
    
    try {
      const result = await client.messages.create({
        body: message,
        from: channel.configuration.from_number, // e.g., 'whatsapp:+14155238886'
        to: `whatsapp:${phoneNumber}`, // Format: whatsapp:+1234567890
      });
      
      // Update notification status
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'sent',
          provider_message_id: result.sid,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
    } catch (error: any) {
      // Update notification with error
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', notification.id);
      
      throw error;
    }
  }
  
  // For Meta WhatsApp Business API
  if (channel.provider === 'meta') {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${channel.configuration.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${channel.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber.replace('+', ''), // Remove + for Meta
          type: 'text',
          text: { body: message },
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'sent',
          provider_message_id: data.messages[0].id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
    } else {
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: 'failed',
          error_message: data.error?.message || 'Failed to send',
        })
        .eq('id', notification.id);
      
      throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }
  }
}
```

## 📊 Check WhatsApp Status

### View Sent Messages

```sql
SELECT 
  id,
  user_id,
  phone_number,
  message,
  status,
  sent_at,
  delivered_at,
  error_message
FROM whatsapp_notifications
ORDER BY created_at DESC
LIMIT 50;
```

### View by User

```sql
SELECT 
  wn.*,
  u.name as user_name,
  u.email
FROM whatsapp_notifications wn
JOIN users u ON wn.user_id = u.id
WHERE wn.user_id = 'user-id'
ORDER BY wn.created_at DESC;
```

## 🧪 Testing

### Test WhatsApp Configuration

```typescript
// Test sending a WhatsApp message
const response = await fetch('/api/notifications/omnichannel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    user_id: 'test-user-id',
    type: 'test',
    title: 'Test WhatsApp',
    message: 'This is a test WhatsApp message',
    channels: {
      whatsapp: true,
    },
  }),
});

const result = await response.json();
console.log('WhatsApp sent:', result);
```

### Check Channel Status

```sql
SELECT 
  channel_type,
  provider,
  is_active,
  configuration->>'from_number' as from_number
FROM notification_channels
WHERE channel_type = 'whatsapp';
```

## ⚠️ Important Notes

1. **Phone Number Format:**
   - Must include country code: `+1234567890`
   - For Twilio: Use `whatsapp:+1234567890` format
   - For Meta: Remove `+` sign: `1234567890`

2. **Twilio Sandbox:**
   - For testing, use sandbox number: `whatsapp:+14155238886`
   - Users must join sandbox by sending code to Twilio
   - For production, get approved WhatsApp Business number

3. **Meta WhatsApp:**
   - Requires WhatsApp Business Account approval
   - Must use approved message templates for most messages
   - Free-form messages only work within 24-hour window after user messages you

4. **Rate Limits:**
   - Twilio: Check your plan limits
   - Meta: 1000 conversations per month (free tier)

5. **Costs:**
   - Twilio: ~$0.005 per message
   - Meta: Free for first 1000 conversations/month

## 🔍 Troubleshooting

### "WhatsApp channel not configured"
- Run the SQL configuration script
- Check `notification_channels` table
- Verify `is_active = true`

### "User phone number not found"
- Add phone number to user profile
- Format: `+1234567890`

### "WhatsApp not enabled for user"
- Update `notification_preferences.whatsapp_enabled = true`
- User can enable in profile settings

### Messages not sending
- Check Twilio/Meta account balance
- Verify API credentials
- Check phone number format
- Review error logs in `whatsapp_notifications` table

## 📚 Resources

- **Twilio WhatsApp:** https://www.twilio.com/docs/whatsapp
- **Meta WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp
- **Setup Guide:** See `md/NOTIFICATION_CHANNELS_SETUP.md`

