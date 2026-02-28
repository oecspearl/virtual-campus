# 📧 How Email Notifications Work - Complete Guide

## 🏗️ **System Architecture**

The email notification system is built on 4 main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Grades, Enrollments, Assignments, Discussions)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Notification Helper Layer                   │
│  lib/notifications.ts                                        │
│  - notifyGradePosted()                                      │
│  - notifyAssignmentDue()                                     │
│  - notifyEnrollment()                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Email Service Layer                      │
│  lib/email-service.ts                                       │
│  - sendEmail()                                              │
│  - replaceTemplateVariables()                               │
│  - wrapEmailTemplate()                                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Service                          │
│  Resend API (resend.com)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Database Structure**

### 1. **email_notifications** Table
**Purpose**: Logs every email sent (audit trail)

```sql
- id: UUID (primary key)
- user_id: UUID (who received it)
- type: VARCHAR (e.g., 'grade_posted', 'assignment_due_reminder')
- subject: VARCHAR (email subject)
- body_html: TEXT (HTML content)
- body_text: TEXT (plain text content)
- status: VARCHAR ('pending', 'sent', 'failed', 'bounced')
- sent_at: TIMESTAMPTZ (when sent)
- error_message: TEXT (if failed, why?)
- metadata: JSONB (additional context)
- created_at, updated_at: TIMESTAMPTZ
```

**Why it exists**: 
- Track all notifications sent
- Debug delivery issues
- Analytics (how many emails sent per type)
- Audit compliance

---

### 2. **email_templates** Table
**Purpose**: Reusable email templates with variable placeholders

```sql
- id: UUID (primary key)
- name: VARCHAR (e.g., 'Grade Posted')
- type: VARCHAR (matches notification type)
- subject_template: TEXT (with {{variables}})
- body_html_template: TEXT (HTML with {{variables}})
- body_text_template: TEXT (plain text with {{variables}})
- variables: JSONB (list of available variables)
- is_active: BOOLEAN (can enable/disable templates)
- created_at, updated_at: TIMESTAMPTZ
```

**Example Template**:
```html
Subject: Your grade for {{assignment_name}} is available

Body: Hello {{student_name}},
      Your grade for {{assignment_name}} 
      in {{course_title}} is {{score}}/{{total_points}}
```

**Why templates?**:
- Consistent branding
- Easy to update email content
- Support multiple languages (future)
- Centralized management

---

### 3. **notification_preferences** Table
**Purpose**: User control over what notifications they receive

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- email_enabled: BOOLEAN (master switch)
- in_app_enabled: BOOLEAN (for future in-app notifications)
- preferences: JSONB (granular per-type settings)
- quiet_hours_start: TIME (e.g., '22:00')
- quiet_hours_end: TIME (e.g., '08:00')
- digest_frequency: VARCHAR ('none', 'daily', 'weekly')
```

**Example preferences JSONB**:
```json
{
  "grade_posted": {"email": true, "in_app": true},
  "assignment_due_reminder": {
    "email": true, 
    "in_app": true, 
    "days_before": 1
  },
  "discussion_reply": {"email": false, "in_app": true}
}
```

**Why preferences?**:
- Users control their notification volume
- Respect user preferences (GDPR/privacy)
- Reduce email fatigue
- Quiet hours prevent midnight notifications

---

### 4. **email_digests** Table
**Purpose**: Scheduled summary emails (daily/weekly)

```sql
- id: UUID (primary key)
- user_id: UUID
- digest_type: VARCHAR ('daily', 'weekly')
- notification_ids: UUID[] (which notifications included)
- subject: VARCHAR
- body_html: TEXT
- status: VARCHAR ('pending', 'sent', 'failed')
- scheduled_for: TIMESTAMPTZ (when to send)
- sent_at: TIMESTAMPTZ
```

**Future use**: Instead of 10 separate emails, send 1 digest with all updates.

---

## 🔄 **How It Works - Step by Step**

### **Example: Grade Posted Notification**

#### Step 1: Event Occurs
```typescript
// Instructor grades an assignment
POST /api/assignments/[id]/submissions/[submissionId]/grade
{
  grade: 85,
  feedback: "Great work!"
}
```

#### Step 2: Notification Triggered
```typescript
// In the grading route (after grade is saved)
import { notifyGradePosted } from '@/lib/notifications';

await notifyGradePosted(studentId, {
  assignmentName: 'Math Quiz 1',
  courseTitle: 'Mathematics 101',
  score: 85,
  totalPoints: 100,
  percentage: 85,
  feedback: 'Great work!',
  courseUrl: 'https://yourapp.com/courses/123'
});
```

#### Step 3: Check User Preferences
```typescript
// Inside notifyGradePosted() function
const preferences = await getPreferences(studentId);

// Check if email enabled globally
if (!preferences.email_enabled) {
  return { success: true }; // Skip, not an error
}

// Check if this specific type enabled
const typePref = preferences.preferences?.['grade_posted'];
if (typePref?.email === false) {
  return { success: true }; // User opted out
}
```

#### Step 4: Load Email Template
```typescript
// Fetch template from database
const template = await supabase
  .from('email_templates')
  .select('*')
  .eq('type', 'grade_posted')
  .eq('is_active', true)
  .single();

// Template has placeholders:
// "Hello {{student_name}}, your grade for {{assignment_name}}..."
```

#### Step 5: Replace Variables
```typescript
// Replace {{variables}} with actual values
const subject = replaceTemplateVariables(
  template.subject_template,
  {
    student_name: 'John Doe',
    assignment_name: 'Math Quiz 1',
    course_title: 'Mathematics 101',
    score: 85,
    total_points: 100,
    percentage: '85%',
    feedback: 'Great work!',
    course_url: 'https://...'
  }
);

// Result: "Your grade for Math Quiz 1 is available"
```

#### Step 6: Send Email via Resend
```typescript
// Send through Resend API
const result = await sendEmail({
  to: 'student@example.com',
  subject: 'Your grade for Math Quiz 1 is available',
  html: '<html>...formatted email...</html>',
  text: 'Plain text version...',
  tags: [{ name: 'notification_type', value: 'grade_posted' }]
});
```

#### Step 7: Log Notification
```typescript
// Save to email_notifications table
await supabase
  .from('email_notifications')
  .insert({
    user_id: studentId,
    type: 'grade_posted',
    subject: '...',
    body_html: '...',
    status: result.success ? 'sent' : 'failed',
    sent_at: result.success ? new Date() : null,
    error_message: result.error || null
  });
```

#### Step 8: Done! ✅
- Student receives email
- Notification logged for audit
- Can check status in database

---

## 🎨 **Template System Explained**

### Variable Replacement

Templates use `{{variable_name}}` syntax:

```html
Subject: Your grade for {{assignment_name}} is available

Body: Hello {{student_name}},
      Your grade: {{score}}/{{total_points}} ({{percentage}}%)
```

### Conditional Blocks

Support for `{{#if variable}}...{{/if}}`:

```html
{{#if feedback}}
  <p><strong>Feedback:</strong> {{feedback}}</p>
{{/if}}
```

Only shows feedback section if feedback exists.

### Available Templates

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

## ⚙️ **User Preferences System**

### How Preferences Work

1. **Global Toggles**
   - `email_enabled`: Master switch (if false, no emails sent)
   - `in_app_enabled`: For future in-app notifications

2. **Per-Type Preferences**
   ```json
   {
     "grade_posted": {"email": true, "in_app": true},
     "assignment_due_reminder": {
       "email": true,
       "in_app": true,
       "days_before": 1
     }
   }
   ```

3. **Quiet Hours**
   - `quiet_hours_start`: '22:00' (10 PM)
   - `quiet_hours_end`: '08:00' (8 AM)
   - No notifications sent during this time

4. **Digest Frequency**
   - `none`: Individual emails immediately
   - `daily`: One email per day with summary
   - `weekly`: One email per week with summary

### User Interface

Users can manage preferences at:
- **URL**: `/profile/notifications`
- **Features**:
  - Toggle email/in-app per notification type
  - Set reminder days before assignment due
  - Configure quiet hours
  - Choose digest frequency

---

## 🔌 **Integration Points**

### Currently Integrated ✅

1. **Assignment Grading**
   ```typescript
   // app/api/assignments/[id]/submissions/[submissionId]/grade/route.ts
   // Automatically sends grade notification
   ```

2. **Course Enrollment**
   ```typescript
   // app/api/courses/[id]/enroll/route.ts
   // Automatically sends enrollment confirmation
   ```

### How to Add More Integrations

Example: Add discussion reply notification

```typescript
// In your discussion reply handler
import { sendNotification } from '@/lib/notifications';

await sendNotification({
  userId: originalPosterId,
  type: 'discussion_reply',
  templateVariables: {
    user_name: originalPoster.name,
    reply_author_name: replyAuthor.name,
    discussion_title: discussion.title,
    course_title: course.title,
    reply_content: reply.content,
    discussion_url: `https://yourapp.com/discussions/${discussionId}`
  }
});
```

---

## 📡 **Resend API Integration**

### How Resend Works

1. **API Key Configuration**
   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@yourdomain.com>
   ```

2. **Email Sending**
   ```typescript
   // lib/email-service.ts
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   const { data, error } = await resend.emails.send({
     from: 'OECS LearnBoard <notifications@yourdomain.com>',
     to: 'student@example.com',
     subject: 'Your grade is available',
     html: '<html>...</html>',
     text: 'Plain text version'
   });
   ```

3. **Branding Wrapper**
   - All emails wrapped in branded HTML template
   - Includes OECS logo
   - Consistent styling
   - Footer with unsubscribe link (future)

### Resend Features Used

- ✅ Transactional emails
- ✅ HTML + plain text support
- ✅ Email tags (for analytics)
- ✅ Error handling
- ✅ Delivery tracking (via status field)

---

## 🔍 **Notification Flow Diagram**

```
User Action (Grade Assignment)
         │
         ▼
   Check Preferences
         │
    ┌────┴────┐
    │ Enabled? │
    └────┬────┘
         │
    ┌────┴────┐
    │   Yes   │──► Load Template
    └────┬────┘    │
         │        ▼
         │   Replace Variables
         │        │
         │        ▼
         │   Send via Resend
         │        │
         │        ▼
         └──► Log Notification
                  │
                  ▼
            Email Delivered ✅
```

---

## 🛠️ **Key Functions Explained**

### 1. `sendEmail()` - Core Email Function

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Subject line',
  html: '<html>HTML content</html>',
  text: 'Plain text version'
});
```

**What it does**:
- Connects to Resend API
- Sends email
- Returns success/error status
- Handles API key missing gracefully

---

### 2. `notifyGradePosted()` - Helper Function

```typescript
await notifyGradePosted(userId, {
  assignmentName: 'Quiz 1',
  courseTitle: 'Math 101',
  score: 85,
  totalPoints: 100,
  percentage: 85,
  feedback: 'Great!',
  courseUrl: 'https://...'
});
```

**What it does**:
- Checks user preferences
- Loads grade_posted template
- Replaces all variables
- Sends email
- Logs notification

---

### 3. `replaceTemplateVariables()` - Template Engine

```typescript
replaceTemplateVariables(
  'Hello {{name}}, you got {{score}}',
  { name: 'John', score: 85 }
);
// Returns: 'Hello John, you got 85'
```

**What it does**:
- Finds all `{{variable}}` placeholders
- Replaces with actual values
- Handles missing variables (empty string)
- Supports conditional blocks `{{#if}}...{{/if}}`

---

### 4. `wrapEmailTemplate()` - Branding

```typescript
const brandedHtml = wrapEmailTemplate(
  '<p>Your grade is available</p>',
  { title: 'Grade Notification' }
);
```

**What it does**:
- Wraps content in branded HTML
- Adds header with logo
- Adds footer with branding
- Ensures consistent styling

---

## 📊 **Notification Status Tracking**

Every notification has a status:

- **`pending`**: Created but not sent yet
- **`sent`**: Successfully sent via Resend
- **`failed`**: Send failed (API error)
- **`bounced`**: Email bounced (invalid address)

**Query notifications**:
```sql
-- See recent notifications
SELECT * FROM email_notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check failed notifications
SELECT * FROM email_notifications 
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🔐 **Security & Privacy**

### Row-Level Security (RLS)

- **Users** can only see their own notifications
- **Admins** can see all notifications
- **Templates** visible to all authenticated users (read-only)
- **Preferences** only manageable by user themselves

### Data Privacy

- User preferences respected (opt-out respected)
- Quiet hours prevent intrusive notifications
- Email addresses not logged unnecessarily
- All emails logged for audit compliance

---

## 🚀 **Usage Examples**

### Send Custom Notification

```typescript
import { sendNotification } from '@/lib/notifications';

await sendNotification({
  userId: 'user-uuid',
  type: 'course_announcement',
  templateVariables: {
    student_name: 'John Doe',
    course_title: 'Mathematics 101',
    announcement_title: 'New Assignment',
    announcement_content: 'Please complete...',
    course_url: 'https://yourapp.com/courses/123'
  }
});
```

### Send to Multiple Users

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

### Direct API Call

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

## 🔧 **Configuration**

### Environment Variables Required

```env
# Required
RESEND_API_KEY=re_your_api_key_here

# Optional (with defaults)
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
NEXT_PUBLIC_APP_URL=https://oecslearning.org
NEXT_PUBLIC_LOGO_URL=/oecs-logo.png
```

### Database Setup

Run the SQL migration:
```sql
-- Execute: create-email-notifications-schema.sql
-- Creates tables, policies, default templates
```

---

## 📈 **Monitoring & Analytics**

### Check Notification Stats

```sql
-- Total notifications sent
SELECT COUNT(*) FROM email_notifications WHERE status = 'sent';

-- Notifications by type
SELECT type, COUNT(*) 
FROM email_notifications 
WHERE status = 'sent'
GROUP BY type;

-- Failed notifications
SELECT COUNT(*) 
FROM email_notifications 
WHERE status = 'failed';
```

### User Preferences Stats

```sql
-- How many users have email enabled
SELECT COUNT(*) 
FROM notification_preferences 
WHERE email_enabled = true;

-- Most common digest frequency
SELECT digest_frequency, COUNT(*) 
FROM notification_preferences 
GROUP BY digest_frequency;
```

---

## 🐛 **Troubleshooting**

### Email Not Sending?

1. **Check API Key**
   ```env
   RESEND_API_KEY=re_... # Must be set
   ```

2. **Check User Preferences**
   ```sql
   SELECT * FROM notification_preferences 
   WHERE user_id = 'user-uuid';
   ```

3. **Check Notification Log**
   ```sql
   SELECT * FROM email_notifications 
   WHERE user_id = 'user-uuid' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

4. **Check Status**
   - If `status = 'failed'`, check `error_message`
   - If `status = 'pending'`, email might be queued

### Template Not Found?

- Ensure template exists in `email_templates` table
- Check `is_active = true`
- Verify `type` matches notification type exactly

---

## 🎯 **Summary**

**How it works in 5 steps:**

1. **Event occurs** → Application triggers notification
2. **Check preferences** → User wants this notification?
3. **Load template** → Get email template from database
4. **Replace variables** → Fill in {{placeholders}}
5. **Send & log** → Send via Resend, log result

**Key Features:**
- ✅ Template-based (consistent branding)
- ✅ User preferences (opt-in/out)
- ✅ Audit trail (all emails logged)
- ✅ Quiet hours (respect user time)
- ✅ Automatic integration (grades, enrollments)

**Status**: Fully functional and ready to use! 🚀

