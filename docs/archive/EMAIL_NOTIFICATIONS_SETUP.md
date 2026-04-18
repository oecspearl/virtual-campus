# 📧 Email Notification System - Setup Guide

## ✅ What Was Implemented

### 1. **Database Schema** ✅
- `email_notifications` - Log of all sent emails
- `email_templates` - Reusable email templates
- `notification_preferences` - User notification settings
- `email_digests` - Scheduled digest emails

### 2. **Email Service Integration** ✅
- Resend API integration (`lib/email-service.ts`)
- Template variable replacement
- Branded email wrapper
- Bulk email support

### 3. **API Endpoints** ✅
- `POST /api/notifications/email/send` - Send emails
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences

### 4. **Helper Functions** ✅
- `lib/notifications.ts` - Easy notification sending
- `notifyGradePosted()` - Grade notifications
- `notifyAssignmentDue()` - Assignment reminders
- `notifyEnrollment()` - Enrollment confirmations

### 5. **User Preferences UI** ✅
- `/profile/notifications` - User preference page
- Granular control per notification type
- Quiet hours configuration
- Email digest settings

### 6. **Integration Points** ✅
- Assignment grading → Grade posted notification
- Course enrollment → Enrollment confirmation

---

## 🚀 **Setup Instructions**

### Step 1: Run Database Migration

Execute the SQL script in Supabase:

```sql
-- Run this in Supabase SQL Editor
-- File: create-email-notifications-schema.sql
```

This creates:
- Email notifications tables
- Default email templates (5 templates)
- RLS policies
- Indexes

### Step 2: Configure Resend API

1. **Sign up for Resend**: https://resend.com
2. **Get API Key**: Create API key in Resend dashboard
3. **Add to Environment Variables**:

```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important**: 
- You need to verify your domain in Resend for production
- For testing, you can use Resend's test email (doesn't actually send)

### Step 3: Verify Installation

Check that Resend was installed:
```bash
npm list resend
```

Should show: `resend@x.x.x`

---

## 📋 **Default Email Templates**

5 templates are automatically created:

1. **Grade Posted** (`grade_posted`)
   - Variables: `student_name`, `assignment_name`, `course_title`, `score`, `total_points`, `percentage`, `feedback`, `course_url`

2. **Assignment Due Reminder** (`assignment_due_reminder`)
   - Variables: `student_name`, `assignment_name`, `course_title`, `due_date`, `time_remaining`, `assignment_url`

3. **Course Announcement** (`course_announcement`)
   - Variables: `student_name`, `course_title`, `announcement_title`, `announcement_content`, `course_url`

4. **Discussion Reply** (`discussion_reply`)
   - Variables: `user_name`, `reply_author_name`, `discussion_title`, `course_title`, `reply_content`, `discussion_url`

5. **Enrollment Confirmation** (`enrollment_confirmation`)
   - Variables: `student_name`, `course_title`, `course_url`

---

## 🔧 **Usage Examples**

### Send Grade Notification (Automatic)

Already integrated! When a grade is posted:
```typescript
// In app/api/assignments/[id]/submissions/[submissionId]/grade/route.ts
// Automatically sends notification
```

### Send Enrollment Notification (Automatic)

Already integrated! When user enrolls:
```typescript
// In app/api/courses/[id]/enroll/route.ts
// Automatically sends notification
```

### Send Custom Notification

```typescript
import { sendNotification } from '@/lib/notifications';

await sendNotification({
  userId: 'user-uuid',
  type: 'course_announcement',
  templateVariables: {
    student_name: 'John Doe',
    course_title: 'Mathematics 101',
    announcement_title: 'Welcome!',
    announcement_content: 'Welcome to the course...',
    course_url: 'https://yourapp.com/courses/123',
  },
});
```

### Send Bulk Notifications

```typescript
import { sendBulkNotifications } from '@/lib/notifications';

await sendBulkNotifications(
  ['user-id-1', 'user-id-2', 'user-id-3'],
  'course_announcement',
  {
    course_title: 'Mathematics 101',
    announcement_title: 'Important Update',
    // ... other variables
  }
);
```

### Use Email API Directly

```typescript
// POST /api/notifications/email/send
const response = await fetch('/api/notifications/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'grade_posted',
    userIds: ['user-id-1', 'user-id-2'],
    templateVariables: {
      student_name: 'John',
      assignment_name: 'Math Quiz',
      // ...
    }
  })
});
```

---

## 🎨 **Customizing Email Templates**

### Edit Templates in Database

```sql
UPDATE email_templates 
SET 
  subject_template = 'Your new subject: {{variable}}',
  body_html_template = '<html>Your new template</html>'
WHERE type = 'grade_posted';
```

Or use the admin UI (to be created).

---

## 📊 **Notification Preferences**

Users can manage preferences at:
- `/profile/notifications`

Features:
- ✅ Enable/disable email notifications globally
- ✅ Enable/disable in-app notifications
- ✅ Per-type preferences (assignment, grade, etc.)
- ✅ Quiet hours (no notifications during these times)
- ✅ Digest frequency (daily/weekly/none)

---

## 🔗 **Integration Points (Still To Do)**

### Already Integrated ✅
1. ✅ Assignment grading → Grade notification
2. ✅ Course enrollment → Enrollment confirmation

### Needs Integration 🔄

1. **Assignment Due Reminders**
   - Create scheduled job/cron
   - Check assignments due soon
   - Send reminders based on user preferences

2. **Course Announcements**
   - When instructor posts announcement
   - Send to all enrolled students

3. **Discussion Replies**
   - When someone replies to user's discussion
   - When user is mentioned in discussion

4. **Quiz Results**
   - When quiz is auto-graded
   - Send results notification

---

## 🛠️ **Scheduled Jobs (Future)**

To send assignment due reminders, create a scheduled job:

```typescript
// app/api/cron/send-assignment-reminders/route.ts
// Run daily at 8 AM
// Checks assignments due in next N days (based on user preference)
// Sends reminders to students
```

Or use:
- Vercel Cron Jobs
- GitHub Actions (scheduled)
- External cron service

---

## 🧪 **Testing**

### Test Email Sending

```bash
# Use Resend test mode or test API key
# Emails won't actually send, but API will return success
```

### Check Notification Logs

```sql
SELECT * FROM email_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check User Preferences

```sql
SELECT * FROM notification_preferences 
WHERE user_id = 'user-uuid';
```

---

## 🔐 **Environment Variables Required**

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Optional (with defaults)
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
NEXT_PUBLIC_APP_URL=https://oecslearning.org
NEXT_PUBLIC_LOGO_URL=/oecs-logo.png
```

---

## ✅ **What's Working**

1. ✅ Database schema created
2. ✅ Email service integrated (Resend)
3. ✅ Template system functional
4. ✅ Notification preferences system
5. ✅ Grade posted notifications (auto)
6. ✅ Enrollment notifications (auto)
7. ✅ User preferences UI

---

## 🔄 **Next Steps to Complete**

1. **Add Assignment Due Reminder Cron** (scheduled job)
2. **Integrate Discussion Notifications** (replies, mentions)
3. **Add Quiz Result Notifications**
4. **Add Course Announcement Notifications**
5. **Build Email Template Admin UI** (optional)

---

## 📝 **Notes**

- If `RESEND_API_KEY` is not set, emails won't send but won't break the app
- All notifications are logged in `email_notifications` table
- Users can opt out of any notification type
- Quiet hours prevent notifications during specified times
- Email digests can summarize multiple notifications

---

**Status**: ✅ Email Notification System Ready!
**Next**: Configure Resend API key and run database migration.

