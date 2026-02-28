# Welcome Email Feature - Testing Guide

## 🎯 Testing Objectives

1. ✅ Verify email template exists in database
2. ✅ Test sending welcome email to a user
3. ✅ Verify email is received with correct content
4. ✅ Verify temporary password works for login

---

## 📋 Prerequisites Checklist

Before testing, ensure you have:

- [ ] **Database migration run** - Template inserted into `email_templates` table
- [ ] **Resend configured** - `RESEND_API_KEY` set in `.env.local`
- [ ] **Admin account** - You can log in as admin
- [ ] **Test user** - A user account to send the welcome email to
- [ ] **Email access** - Access to the test user's email inbox

---

## 🚀 Step-by-Step Testing Process

### Step 1: Insert the Email Template

**Option A: Via Supabase SQL Editor (Recommended)**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of:
   ```
   database/migrations/002-add-student-welcome-template.sql
   ```
5. Paste into the SQL Editor
6. Click **Run** (or press `Ctrl+Enter`)
7. You should see: `Success. No rows returned`

**Option B: Via Supabase Table Editor**

1. Go to **Table Editor** → `email_templates`
2. Click **Insert** → **Insert row**
3. Fill in the fields from the migration file
4. Click **Save**

**Verify Template Exists:**

Run this query in SQL Editor:
```sql
SELECT name, type, is_active, created_at 
FROM email_templates 
WHERE type = 'student_welcome';
```

Expected result: 1 row showing "Student Welcome" template

---

### Step 2: Log In as Admin

1. Open your browser to: `http://localhost:3000/auth/signin`
2. Log in with admin credentials
3. Verify you see the admin dashboard

---

### Step 3: Navigate to User Management

1. Go to: `http://localhost:3000/admin/users/manage`
2. You should see a list of users
3. Search or scroll to find a test user

**If you don't have a test user:**

1. Click **"Add New User"** button
2. Fill in the form:
   - **Email**: `test@example.com` (use your real email for testing)
   - **Name**: `Test Student`
   - **Role**: `student`
   - **Password**: (any password, it will be reset)
3. Click **Create User**

---

### Step 4: Send Welcome Email

1. Find your test user in the list
2. Look for the **"Send Welcome Email"** button (mail icon)
3. Click the button
4. Confirm the action when prompted

**Expected Behavior:**

- ✅ Confirmation dialog appears
- ✅ After confirming, you see a success message
- ✅ Message shows: "Welcome email sent to [user name] successfully!"
- ✅ The temporary password is displayed (save this!)

**If you see an error:**

- ❌ "Template not found" → Go back to Step 1
- ❌ "Email service not configured" → Check Resend setup
- ❌ "Domain not verified" → Use `onboarding@resend.dev` in `.env.local`

---

### Step 5: Check Email Inbox

1. Open the email inbox for the test user
2. Look for email with subject: **"Welcome to OECS LearnBoard - Your Learning Journey Begins!"**
3. Check spam/junk folder if not in inbox

**Email Should Contain:**

- ✅ Welcome header with OECS LearnBoard branding
- ✅ Student's name
- ✅ Login credentials section with:
  - Email address
  - Temporary password
- ✅ Platform access section with login link
- ✅ Getting started guide (5 steps)
- ✅ Tools overview
- ✅ Support links
- ✅ "Get Started Now" button

---

### Step 6: Test Login with Temporary Password

1. **Open incognito/private browser window** (to avoid session conflicts)
2. Go to: `http://localhost:3000/auth/signin`
3. Enter:
   - **Email**: Test user's email
   - **Password**: Temporary password from email
4. Click **Sign In**

**Expected Behavior:**

- ✅ Login successful
- ✅ Redirected to student dashboard
- ✅ See welcome message or onboarding flow

**After Login:**

1. Go to **Profile** or **Settings**
2. Change the password to a new one
3. Verify password change works

---

### Step 7: Verify Email Logging

Check that the email was logged in the database:

```sql
SELECT 
  id,
  user_id,
  type,
  subject,
  status,
  sent_at,
  error_message
FROM email_notifications
WHERE type = 'student_welcome'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**

- ✅ One row for the email you just sent
- ✅ `status` = `'sent'`
- ✅ `sent_at` has a timestamp
- ✅ `error_message` is `NULL`

---

## 🧪 Advanced Testing

### Test Bulk Welcome Emails

1. Go to User Management page
2. Select multiple users (checkboxes)
3. Click **"Send Welcome Email"** in the bulk actions bar
4. Confirm the action
5. Verify all users receive emails

### Test Email Template Variables

Verify all template variables are replaced correctly:

- `{{student_name}}` → Actual student name
- `{{student_email}}` → Actual email address
- `{{temporary_password}}` → Generated password (12 chars, mixed)
- `{{platform_url}}` → Your app URL
- `{{login_url}}` → Login page URL
- `{{help_url}}` → Help center URL

### Test Error Handling

**Test 1: Invalid User ID**
```bash
curl -X POST http://localhost:3000/api/admin/users/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"userId": "invalid-uuid"}'
```
Expected: 404 error

**Test 2: Missing Resend API Key**

1. Temporarily remove `RESEND_API_KEY` from `.env.local`
2. Restart dev server
3. Try sending welcome email
4. Expected: Error message about email service not configured

---

## 📊 Test Results Checklist

Mark each item as you complete it:

### Database Setup
- [ ] Email template exists in database
- [ ] Template is marked as active (`is_active = true`)
- [ ] Template has all required variables

### Email Sending
- [ ] Welcome email sends successfully
- [ ] Success message appears in UI
- [ ] Temporary password is generated
- [ ] No errors in browser console
- [ ] No errors in server logs

### Email Content
- [ ] Email received in inbox (not spam)
- [ ] Subject line is correct
- [ ] Student name appears correctly
- [ ] Email address appears correctly
- [ ] Temporary password is shown
- [ ] All links work (platform URL, login URL, help URL)
- [ ] Email design looks professional
- [ ] Email is mobile-responsive

### Login Functionality
- [ ] Can log in with temporary password
- [ ] Redirected to correct page after login
- [ ] Can change password after login
- [ ] New password works for subsequent logins

### Database Logging
- [ ] Email logged in `email_notifications` table
- [ ] Status is 'sent'
- [ ] Timestamp is correct
- [ ] No error messages

### Bulk Operations
- [ ] Can select multiple users
- [ ] Bulk send works
- [ ] All selected users receive emails
- [ ] Success/failure count is accurate

---

## 🐛 Troubleshooting

### Issue: "Template not found for type: student_welcome"

**Solution:**
1. Run the migration: `database/migrations/002-add-student-welcome-template.sql`
2. Verify with: `SELECT * FROM email_templates WHERE type = 'student_welcome';`

### Issue: "Email service not configured"

**Solution:**
1. Check `.env.local` has `RESEND_API_KEY`
2. Restart dev server: `npm run dev`
3. Verify Resend API key is valid

### Issue: "Domain is not verified"

**Solution:**
1. Use test domain: `RESEND_FROM_EMAIL=onboarding@resend.dev`
2. Or verify your domain in Resend dashboard

### Issue: Email not received

**Check:**
1. Spam/junk folder
2. Email address is correct
3. Resend dashboard for delivery status
4. `email_notifications` table for error messages

### Issue: Temporary password doesn't work

**Check:**
1. Password was actually updated (check success message)
2. Using correct email address
3. No typos in password (copy-paste recommended)
4. User account is not locked/disabled

---

## 📝 Test Report Template

```markdown
## Welcome Email Test Report

**Date:** [Date]
**Tester:** [Your Name]
**Environment:** [Development/Staging/Production]

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Template exists in DB | ✅/❌ | |
| Email sends successfully | ✅/❌ | |
| Email received | ✅/❌ | |
| Content is correct | ✅/❌ | |
| Links work | ✅/❌ | |
| Login with temp password | ✅/❌ | |
| Password change works | ✅/❌ | |
| Email logged in DB | ✅/❌ | |
| Bulk send works | ✅/❌ | |

### Issues Found

1. [Issue description]
2. [Issue description]

### Screenshots

[Attach screenshots of:]
- Success message
- Email in inbox
- Email content
- Login screen
```

---

## 🎓 Next Steps After Testing

Once testing is complete and successful:

1. **Document the feature** for your team
2. **Train admins** on how to use it
3. **Set up monitoring** for failed emails
4. **Configure production** Resend settings
5. **Verify domain** for production emails
6. **Test in staging** before production deployment

---

**Last Updated:** December 5, 2024
