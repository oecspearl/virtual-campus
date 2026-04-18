# ✅ Email Notifications - Setup Checklist

## Step 1: Database Setup ⚠️ REQUIRED

1. **Run the SQL migration script**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `create-email-notifications-schema.sql`
   - This creates:
     - `email_notifications` table
     - `email_templates` table (with 5 default templates)
     - `notification_preferences` table
     - `email_digests` table
     - RLS policies
     - Indexes

2. **Verify tables were created**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('email_notifications', 'email_templates', 'notification_preferences', 'email_digests');
   ```

3. **Verify default templates exist**
   ```sql
   SELECT type, name, is_active 
   FROM email_templates;
   ```
   Should show 5 templates:
   - `grade_posted`
   - `assignment_due_reminder`
   - `course_announcement`
   - `discussion_reply`
   - `enrollment_confirmation`

---

## Step 2: Resend API Setup ⚠️ REQUIRED

1. **Sign up for Resend**
   - Go to: https://resend.com
   - Create a free account (100 emails/day free tier)

2. **Get your API Key**
   - Dashboard → API Keys
   - Click "Create API Key"
   - Copy the key (starts with `re_`)

3. **Domain Verification** ⚠️ IMPORTANT

   **Option A: Use Resend Test Domain (Quick Start - No Verification Needed)**
   - For testing/development, you can use: `onboarding@resend.dev`
   - No domain verification required
   - Limited to testing purposes
   - Update your `.env`:
     ```env
     RESEND_FROM_EMAIL=onboarding@resend.dev
     ```

   **Option B: Verify Your Domain (Production - Recommended)**
   - Go to Dashboard → Domains
   - Click "Add Domain"
   - Enter your domain (e.g., `oecslearning.org`)
   - Resend provides DNS records to add:
     - SPF record
     - DKIM record (usually 3 records)
   - Add these records to your DNS provider
   - Wait for verification (can take minutes to hours)
   - Once verified, use: `notifications@oecslearning.org`

---

## Step 3: Environment Variables ⚠️ REQUIRED

Add to your `.env.local` file (or Heroku config vars):

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (with defaults)
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
NEXT_PUBLIC_APP_URL=https://learnboard.oecslearning.org
NEXT_PUBLIC_LOGO_URL=/Logo.png
```

**For Heroku:**
```bash
heroku config:set RESEND_API_KEY=re_xxxxxxxxxxxxx
heroku config:set RESEND_FROM_EMAIL="OECS LearnBoard <notifications@oecslearning.org>"
heroku config:set NEXT_PUBLIC_APP_URL=https://learnboard.oecslearning.org
```

**Verify variables are set:**
```bash
# Local
cat .env.local | grep RESEND

# Heroku
heroku config | grep RESEND
```

---

## Step 4: Verify Package Installation ✅

```bash
npm list resend
```

Should show: `resend@3.2.0` or similar

If not installed:
```bash
npm install resend
```

---

## Step 5: Test Email Sending 🧪

### Option A: Test via API (Recommended)

1. **Create a test script** or use the API directly:

```bash
curl -X POST http://localhost:3000/api/notifications/email/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "type": "enrollment_confirmation",
    "emailAddresses": ["your-test-email@example.com"],
    "templateVariables": {
      "student_name": "Test User",
      "course_title": "Test Course",
      "course_url": "https://learnboard.oecslearning.org/courses/123"
    }
  }'
```

### Option B: Test via Grade Assignment

1. Grade an assignment submission
2. Check that email notification is sent to student
3. Verify in Resend dashboard → Emails (should show sent email)

### Option C: Test via Enrollment

1. Enroll a student in a course
2. Check that enrollment confirmation email is sent
3. Verify in database:

```sql
SELECT * FROM email_notifications 
ORDER BY created_at DESC 
LIMIT 5;
```

Should show the notification with `status = 'sent'`

---

## Step 6: Check Notification Preferences 📧

1. **User can access preferences:**
   - Navigate to: `/profile/notifications`
   - Should see notification settings page

2. **Default preferences should exist:**
   ```sql
   SELECT * FROM notification_preferences 
   WHERE user_id = 'your-user-id';
   ```

3. **Create default preferences if missing:**
   - Users get default preferences automatically when they visit `/profile/notifications`
   - Or manually:
   ```sql
   INSERT INTO notification_preferences (user_id, email_enabled, preferences)
   VALUES (
     'user-uuid',
     true,
     '{
       "grade_posted": {"email": true},
       "assignment_due_reminder": {"email": true},
       "enrollment_confirmation": {"email": true}
     }'::jsonb
   );
   ```

---

## Step 7: Verify Integration Points ✅

### Already Integrated:
1. ✅ **Grade Posted** - `app/api/assignments/[id]/submissions/[submissionId]/grade/route.ts`
2. ✅ **Enrollment Confirmation** - `app/api/courses/[id]/enroll/route.ts`

### Still Need Integration:
1. ⚠️ **Assignment Due Reminders** - Need scheduled job
2. ⚠️ **Course Announcements** - Need integration in announcements feature
3. ⚠️ **Discussion Replies** - Need integration in discussions feature
4. ⚠️ **Quiz Results** - Need integration in quiz completion

---

## Step 8: Monitor Email Logs 📊

### Check Sent Emails in Database:
```sql
SELECT 
  type,
  status,
  sent_at,
  error_message,
  created_at
FROM email_notifications
ORDER BY created_at DESC
LIMIT 20;
```

### Check Failed Emails:
```sql
SELECT *
FROM email_notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Resend Dashboard:
- Go to Resend Dashboard → Emails
- See all sent emails, delivery status, opens, clicks

---

## Step 9: Troubleshooting 🔧

### Emails Not Sending?

1. **Check API Key:**
   ```bash
   # Should not be empty
   echo $RESEND_API_KEY
   ```

2. **Check Console Logs:**
   - Look for: "Resend API key not configured"
   - Look for: "Resend error:"

3. **Check Database:**
   ```sql
   SELECT status, error_message 
   FROM email_notifications 
   WHERE status = 'failed'
   ORDER BY created_at DESC;
   ```

4. **Test Resend API Directly:**
   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "notifications@oecslearning.org",
       "to": "test@example.com",
       "subject": "Test Email",
       "html": "<p>This is a test</p>"
     }'
   ```

### Common Issues:

**Issue:** "Resend API key not configured"
- **Fix:** Set `RESEND_API_KEY` in environment variables

**Issue:** "Domain not verified"
- **Fix:** Verify your domain in Resend dashboard
- **Or:** Use Resend's test domain (for testing only)

**Issue:** "Template not found"
- **Fix:** Run `create-email-notifications-schema.sql` to create default templates

**Issue:** "User email not found"
- **Fix:** Ensure users have email addresses in `user_profiles` or `users` table

**Issue:** "Permission denied"
- **Fix:** Check RLS policies are correct
- **Or:** Use service client for sending (already implemented)

---

## Step 9.5: Important Fix Applied ✅

**Fixed:** Email lookup was looking in wrong table
- ✅ Fixed `lib/notifications.ts` to look in `users` table (not `user_profiles`)
- ✅ Email notifications will now find user emails correctly

**This fix is already applied in the code!**

---

## Step 10: Production Checklist 🚀

Before going live:

- [ ] Resend API key is set in production environment
- [ ] Domain is verified in Resend
- [ ] `RESEND_FROM_EMAIL` uses verified domain
- [ ] `NEXT_PUBLIC_APP_URL` is set correctly
- [ ] All default email templates exist
- [ ] Test sending an email in production
- [ ] Monitor first few emails for delivery
- [ ] Set up email monitoring/alerts (optional)
- [ ] Configure bounce handling (in Resend dashboard)
- [ ] Set up unsubscribe links in templates (optional)

---

## Quick Test Script

Save as `test-email.js` and run:

```javascript
// test-email.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'OECS LearnBoard <notifications@oecslearning.org>',
      to: 'your-test-email@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email from OECS LearnBoard</p>',
    });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success! Email ID:', data.id);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testEmail();
```

Run:
```bash
RESEND_API_KEY=re_xxxxx node test-email.js
```

---

## Summary ✅

**Minimum Required:**
1. ✅ Run database migration (`create-email-notifications-schema.sql`)
2. ✅ Get Resend API key
3. ✅ Set `RESEND_API_KEY` environment variable
4. ✅ Verify `resend` package is installed

**For Full Functionality:**
5. ✅ Set `RESEND_FROM_EMAIL` (uses verified domain)
6. ✅ Set `NEXT_PUBLIC_APP_URL`
7. ✅ Test sending an email
8. ✅ Monitor email logs

**Current Status:**
- ✅ Grade posted notifications work (after setup)
- ✅ Enrollment notifications work (after setup)
- ⚠️ Assignment reminders need scheduled job
- ⚠️ Other notification types need integration

---

**Need Help?** Check:
- `EMAIL_NOTIFICATIONS_SETUP.md` - Full setup guide
- `EMAIL_NOTIFICATIONS_EXPLAINED.md` - How it works
- Resend Docs: https://resend.com/docs

