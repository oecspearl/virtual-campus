# 📧 Admin Guide: Sending Welcome Emails to Students

This guide explains how administrators can send welcome emails to students who are first accessing the OECS LearnBoard platform.

## Overview

There are **two ways** for admins to send welcome emails:

1. **Automatic**: When inviting a new user (recommended)
2. **Manual**: Send to existing users via API endpoint

---

## Method 1: Automatic Welcome Email (When Inviting New Users)

### How It Works

When an admin invites a new user through the admin interface, the welcome email is **automatically sent** if:
- The `sendInvite` parameter is set to `true` (default)
- The user is successfully created

### Using the Admin Interface

1. Navigate to **Admin → Users → Invite User**
2. Fill in the user details:
   - Full Name
   - Email Address
   - Role (Student, Instructor, etc.)
3. Click **"Send Invitation"**
4. The system will:
   - Create the user account
   - Generate a temporary password
   - **Automatically send the welcome email** with login credentials

### What the User Receives

The welcome email includes:
- ✅ Login credentials (email and temporary password)
- ✅ Platform URL and direct login link
- ✅ Getting started instructions
- ✅ Overview of available tools
- ✅ Navigation and learning tips
- ✅ Support resources

### API Usage

```typescript
// POST /api/admin/users/invite
const response = await fetch('/api/admin/users/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    name: 'John Doe',
    role: 'student',
    sendInvite: true  // Set to false to skip email
  })
});

const data = await response.json();
// Response includes:
// - user: Created user object
// - tempPassword: Temporary password
// - emailSent: true/false
// - note: Status message
```

---

## Method 2: Manual Welcome Email (For Existing Users)

### When to Use

Use this method when:
- You need to resend a welcome email to an existing user
- A user was created before the welcome email feature was added
- You want to send a welcome email with a new temporary password

### Using the API Endpoint

#### Endpoint
```
POST /api/admin/users/send-welcome-email
```

#### Request Body
```json
{
  "userId": "user-uuid-here",
  "temporaryPassword": "optional-password"  // Optional: if not provided, a random password will be generated
}
```

#### Example: Send with Auto-Generated Password

```typescript
const response = await fetch('/api/admin/users/send-welcome-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123e4567-e89b-12d3-a456-426614174000'
  })
});

const data = await response.json();
// Response includes:
// - success: true/false
// - message: Status message
// - email: User's email address
// - temporaryPassword: The password (newly generated or provided)
```

#### Example: Send with Custom Password

```typescript
const response = await fetch('/api/admin/users/send-welcome-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123e4567-e89b-12d3-a456-426614174000',
    temporaryPassword: 'CustomPass123!'
  })
});
```

#### Response Format

**Success:**
```json
{
  "success": true,
  "message": "Welcome email sent successfully",
  "email": "student@example.com",
  "temporaryPassword": "TempPass123!"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here",
  "email": "student@example.com",
  "temporaryPassword": "TempPass123!"  // Still provided even if email fails
}
```

---

## Integration Examples

### Example 1: Add "Send Welcome Email" Button to Admin UI

```typescript
// In your admin user management component
const handleSendWelcomeEmail = async (userId: string) => {
  try {
    const response = await fetch('/api/admin/users/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`Welcome email sent to ${data.email}`);
      // Optionally show the temporary password
      console.log('Temporary password:', data.temporaryPassword);
    } else {
      alert(`Failed to send email: ${data.error}`);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    alert('Failed to send welcome email');
  }
};

// In your component JSX
<button 
  onClick={() => handleSendWelcomeEmail(user.id)}
  className="bg-blue-600 text-white px-4 py-2 rounded"
>
  Send Welcome Email
</button>
```

### Example 2: Bulk Send Welcome Emails

```typescript
const sendBulkWelcomeEmails = async (userIds: string[]) => {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const response = await fetch('/api/admin/users/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      results.push({
        userId,
        success: data.success,
        email: data.email,
        error: data.error
      });
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
};
```

### Example 3: Send Welcome Email After CSV Import

```typescript
// After importing users via CSV
const importedUsers = [...]; // Array of imported user IDs

for (const user of importedUsers) {
  if (user.role === 'student') {
    await fetch('/api/admin/users/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id,
        temporaryPassword: user.temporaryPassword // If you stored it during import
      })
    });
  }
}
```

---

## Email Template Customization

The welcome email uses the `student_welcome` template from the database. To customize it:

1. **Access the template** in Supabase:
   ```sql
   SELECT * FROM email_templates WHERE type = 'student_welcome';
   ```

2. **Update the template**:
   ```sql
   UPDATE email_templates
   SET 
     subject_template = 'Your Custom Subject',
     body_html_template = '<html>...</html>',
     body_text_template = 'Plain text version...'
   WHERE type = 'student_welcome';
   ```

3. **Template variables** available:
   - `{{student_name}}` - Student's full name
   - `{{student_email}}` - Student's email
   - `{{temporary_password}}` - Temporary password
   - `{{platform_url}}` - Platform base URL
   - `{{login_url}}` - Direct login link
   - `{{help_url}}` - Help center link

---

## Troubleshooting

### Email Not Sending

1. **Check Resend Configuration**:
   - Verify `RESEND_API_KEY` is set in environment variables
   - Check domain is verified in Resend dashboard

2. **Check Email Logs**:
   ```sql
   SELECT * FROM email_notifications 
   WHERE type = 'student_welcome' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Check User Exists**:
   ```sql
   SELECT id, email, name FROM users WHERE id = 'user-id-here';
   ```

### Password Issues

- If password update fails, check Supabase Auth admin permissions
- Ensure the user exists in both `auth.users` and `users` tables
- Verify the admin has proper permissions

### Template Not Found

- Ensure the email template exists:
  ```sql
  SELECT * FROM email_templates WHERE type = 'student_welcome';
  ```
- If missing, run the `create-email-notifications-schema.sql` script

---

## Security Considerations

1. **Temporary Passwords**:
   - Passwords are auto-generated (12 characters, mixed case, numbers, symbols)
   - Users should change password immediately after first login
   - Passwords are only shown in API responses (not logged)

2. **Access Control**:
   - Only admins and super_admins can send welcome emails
   - API endpoints verify admin role before processing

3. **Email Delivery**:
   - Email failures don't prevent user creation
   - Temporary password is always returned in API response
   - Admins can manually share credentials if email fails

---

## Best Practices

1. **Always send welcome emails** when creating new users
2. **Store temporary passwords securely** if you need to share them manually
3. **Monitor email delivery** by checking `email_notifications` table
4. **Test email templates** before sending to production users
5. **Keep templates updated** with current platform features

---

## Related Documentation

- [Student Welcome Email Guide](./STUDENT_WELCOME_EMAIL_GUIDE.md) - Technical details about the email template
- [Email Notifications Setup](./EMAIL_NOTIFICATIONS_SETUP.md) - Email system configuration
- [User Onboarding Guide](./USER_ONBOARDING_GUIDE.md) - User onboarding process

---

## Quick Reference

### Automatic (Recommended)
✅ Use when: Creating new users  
✅ Method: Invite user via admin interface  
✅ Email: Sent automatically

### Manual
✅ Use when: Resending to existing users  
✅ Endpoint: `POST /api/admin/users/send-welcome-email`  
✅ Body: `{ userId: string, temporaryPassword?: string }`

