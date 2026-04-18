# 📧 Student Welcome Email Guide

## Overview

The Student Welcome Email is a comprehensive onboarding email sent to students when they first access the OECS LearnBoard platform. This email provides:

- ✅ Login credentials (email and temporary password)
- ✅ Platform URL and direct login link
- ✅ Getting started instructions
- ✅ Overview of available tools and features
- ✅ Navigation tips for better platform usage
- ✅ Learning tips for optimal experience
- ✅ Support resources

## Email Template Details

### Template Name
`Student Welcome`

### Template Type
`student_welcome`

### Template Variables

The email template uses the following variables that must be provided:

| Variable | Description | Example |
|----------|-------------|---------|
| `student_name` | Full name of the student | "John Doe" |
| `student_email` | Email address of the student | "john.doe@example.com" |
| `temporary_password` | Temporary password for first login | "TempPass123!" |
| `platform_url` | Base URL of the platform | "https://learnboard.oecslearning.org" |
| `login_url` | Direct link to sign-in page | "https://learnboard.oecslearning.org/auth/signin" |
| `help_url` | Link to help center | "https://learnboard.oecslearning.org/help/student" |

## Usage

### Method 1: Using the Helper Function (Recommended)

The easiest way to send a welcome email is using the `notifyStudentWelcome()` helper function:

```typescript
import { notifyStudentWelcome } from '@/lib/notifications';

// After creating a new student account
const result = await notifyStudentWelcome(userId, {
  temporaryPassword: 'TempPass123!',
  platformUrl: 'https://learnboard.oecslearning.org', // Optional, defaults to env var
  loginUrl: 'https://learnboard.oecslearning.org/auth/signin', // Optional
  helpUrl: 'https://learnboard.oecslearning.org/help/student', // Optional
});

if (result.success) {
  console.log('Welcome email sent successfully!');
} else {
  console.error('Failed to send welcome email:', result.error);
}
```

### Method 2: Using the Generic Notification Function

You can also use the generic `sendNotification()` function:

```typescript
import { sendNotification } from '@/lib/notifications';

const result = await sendNotification({
  userId: studentId,
  type: 'student_welcome',
  templateVariables: {
    student_name: 'John Doe',
    student_email: 'john.doe@example.com',
    temporary_password: 'TempPass123!',
    platform_url: 'https://learnboard.oecslearning.org',
    login_url: 'https://learnboard.oecslearning.org/auth/signin',
    help_url: 'https://learnboard.oecslearning.org/help/student',
  },
});
```

### Method 3: Direct Email Service

For more control, you can use the email service directly:

```typescript
import { sendEmail, replaceTemplateVariables, wrapEmailTemplate } from '@/lib/email-service';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

// Get the template from database
const supabase = createServiceSupabaseClient();
const { data: template } = await supabase
  .from('email_templates')
  .select('*')
  .eq('type', 'student_welcome')
  .eq('is_active', true)
  .single();

if (template) {
  const variables = {
    student_name: 'John Doe',
    student_email: 'john.doe@example.com',
    temporary_password: 'TempPass123!',
    platform_url: 'https://learnboard.oecslearning.org',
    login_url: 'https://learnboard.oecslearning.org/auth/signin',
    help_url: 'https://learnboard.oecslearning.org/help/student',
  };

  const subject = replaceTemplateVariables(template.subject_template, variables);
  const html = replaceTemplateVariables(template.body_html_template, variables);

  await sendEmail({
    to: 'john.doe@example.com',
    subject,
    html: wrapEmailTemplate(html, { title: 'Welcome to OECS LearnBoard' }),
  });
}
```

## Integration Example: User Invitation

Here's how to integrate the welcome email into the user invitation process:

```typescript
// app/api/admin/users/invite/route.ts
import { notifyStudentWelcome } from '@/lib/notifications';

export async function POST(request: Request) {
  // ... existing user creation code ...
  
  const tempPassword = generateTempPassword();
  
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: name,
      role: role,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create user profile in database
  const { data: userRecord, error: profileError } = await serviceSupabase
    .from('users')
    .insert([{
      id: authData.user.id,
      email: email,
      name: name,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  // Send welcome email
  if (userRecord && sendInvite) {
    try {
      await notifyStudentWelcome(authData.user.id, {
        temporaryPassword: tempPassword,
      });
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ 
    message: "User created successfully",
    user: userRecord,
    tempPassword: tempPassword,
  });
}
```

## Email Content Sections

The welcome email includes the following sections:

### 1. **Login Credentials**
- Email address
- Temporary password
- Security reminder to change password

### 2. **Platform Access**
- Platform URL
- Direct sign-in button

### 3. **Getting Started**
- Step-by-step onboarding instructions
- Password change reminder
- Profile completion guidance

### 4. **Tools at Your Disposal**
- My Courses
- Assignments
- Quizzes
- Discussions
- AI Tutor
- Progress Tracking
- Certificates
- Gamification

### 5. **Navigation Tips**
- Dashboard usage
- Course navigation
- Assignment management
- Search functionality
- Profile access

### 6. **Learning Tips**
- Daily learning habits
- AI Tutor usage
- Discussion participation
- Progress tracking
- Lesson sequencing
- Feedback review
- Streak maintenance
- Preference customization

### 7. **Quick Actions**
- Bookmarking
- Browser notifications
- Help center access
- Email notifications

### 8. **Support Section**
- Help center link
- Support email contact

## Customization

### Updating the Template

To modify the email template, update it in the database:

```sql
UPDATE email_templates
SET 
  subject_template = 'Your Custom Subject',
  body_html_template = '<html>...</html>',
  body_text_template = 'Plain text version...'
WHERE type = 'student_welcome';
```

### Environment Variables

Make sure these environment variables are set:

```env
NEXT_PUBLIC_APP_URL=https://learnboard.oecslearning.org
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
```

## Testing

### Test the Email Template

1. **Create a test user**:
   ```sql
   INSERT INTO users (id, email, name, role)
   VALUES (gen_random_uuid(), 'test@example.com', 'Test Student', 'student');
   ```

2. **Send test email**:
   ```typescript
   await notifyStudentWelcome(userId, {
     temporaryPassword: 'TestPass123!',
   });
   ```

3. **Check email logs**:
   ```sql
   SELECT * FROM email_notifications 
   WHERE type = 'student_welcome' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## Best Practices

1. **Send Immediately**: Send the welcome email right after account creation
2. **Include All Variables**: Ensure all template variables are provided
3. **Test First**: Always test with a real email address before production
4. **Monitor Delivery**: Check email notification logs for delivery status
5. **Update Regularly**: Keep the template content current with platform features
6. **Security**: Never log or expose temporary passwords in error messages

## Troubleshooting

### Email Not Sending

1. Check Resend API key is configured
2. Verify domain is verified in Resend
3. Check email notification logs for errors
4. Ensure user email is valid

### Template Variables Not Replacing

1. Verify all variables are provided
2. Check variable names match exactly (case-sensitive)
3. Ensure template is active in database

### Email Formatting Issues

1. Test in multiple email clients
2. Check HTML is valid
3. Verify inline CSS is used (email clients don't support external stylesheets)

## Related Documentation

- [Email Notifications Setup](./EMAIL_NOTIFICATIONS_SETUP.md)
- [User Onboarding Guide](./USER_ONBOARDING_GUIDE.md)
- [Email Service Documentation](../lib/email-service.ts)

