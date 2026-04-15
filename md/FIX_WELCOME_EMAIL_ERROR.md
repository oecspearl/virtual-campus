# Fix: "Template not found for type: student_welcome" Error

## Problem
The welcome email feature is trying to send emails using the `student_welcome` template, but this template doesn't exist in your database yet.

## Solution

You need to insert the email template into your database. There are two ways to do this:

---

### Option 1: Run the Migration SQL File (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** in the left sidebar

2. **Run the Migration**:
   - Copy the contents of `database/migrations/002-add-student-welcome-template.sql`
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify**:
   ```sql
   SELECT name, type, is_active 
   FROM email_templates 
   WHERE type = 'student_welcome';
   ```
   
   You should see one row with the "Student Welcome" template.

---

### Option 2: Quick Fix via Supabase Dashboard

1. **Go to Table Editor**:
   - Open your Supabase dashboard
   - Navigate to **Table Editor**
   - Select the `email_templates` table

2. **Insert New Row**:
   - Click **Insert** → **Insert row**
   - Fill in the following fields:
     - **name**: `Student Welcome`
     - **type**: `student_welcome`
     - **subject_template**: `Welcome to OECS LearnBoard - Your Learning Journey Begins!`
     - **is_active**: `true` (checked)
     - **body_html_template**: Copy from the migration file
     - **body_text_template**: Copy from the migration file
     - **variables**: `["student_name", "student_email", "temporary_password", "platform_url", "login_url", "help_url"]`

3. **Save** the row

---

### Option 3: Run via psql or Database Client

If you have direct database access:

```bash
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f database/migrations/002-add-student-welcome-template.sql
```

---

## After Running the Migration

1. **Restart your development server** (if running):
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Test the welcome email feature**:
   - Go to `/admin/users/manage`
   - Select a user
   - Click "Send Welcome Email"
   - The email should now send successfully!

---

## Verification

To verify the template is working, you can:

1. **Check the database**:
   ```sql
   SELECT * FROM email_templates WHERE type = 'student_welcome';
   ```

2. **Test sending a welcome email**:
   - Navigate to Admin → User Management
   - Select a test user
   - Click "Send Welcome Email"
   - Check for success message (no error)

3. **Check email logs** (if configured):
   ```sql
   SELECT * FROM email_notifications 
   WHERE type = 'student_welcome' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## Template Variables

The student welcome template uses these variables:

- `{{student_name}}` - Student's full name
- `{{student_email}}` - Student's email address
- `{{temporary_password}}` - Generated temporary password
- `{{platform_url}}` - Your platform URL (from `NEXT_PUBLIC_APP_URL`)
- `{{login_url}}` - Direct login page URL
- `{{help_url}}` - Help center URL

These are automatically populated when the email is sent.

---

## Troubleshooting

### Error: "relation email_templates does not exist"

You need to create the email notifications schema first:

```bash
# Run this SQL file first:
database/create-email-notifications-schema.sql
```

### Error: "duplicate key value violates unique constraint"

The template already exists. Update it instead:

```sql
UPDATE email_templates
SET 
  subject_template = 'Welcome to OECS LearnBoard - Your Learning Journey Begins!',
  body_html_template = '...', -- paste from migration file
  body_text_template = '...', -- paste from migration file
  is_active = true,
  updated_at = NOW()
WHERE type = 'student_welcome';
```

### Still Getting Errors?

1. Check that Resend is configured (see `RESEND_SETUP.md`)
2. Verify `RESEND_API_KEY` is set in `.env.local`
3. Check server logs for detailed error messages
4. Ensure the `email_templates` table exists in your database

---

## Related Files

- Migration: `database/migrations/002-add-student-welcome-template.sql`
- Full schema: `database/create-email-notifications-schema.sql`
- Notification service: `lib/notifications.ts`
- Email service: `lib/email-service.ts`
- API endpoint: `app/api/admin/users/send-welcome-email/route.ts`

---

**Last Updated**: December 5, 2024
