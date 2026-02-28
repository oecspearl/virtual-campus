# Resend Email Service Configuration Guide

## Overview

Your OECS LearnBoard application uses [Resend](https://resend.com) for email delivery. This guide will help you complete the Resend implementation.

---

## 📋 Current Implementation Status

### ✅ Already Implemented:
- Email service library (`lib/email-service.ts`)
- Email templates with branded HTML
- Bulk email support with rate limiting
- Template variable replacement system
- Test email endpoint (`/api/notifications/test`)
- Admin test email page (`/admin/test-email`)

### 🔧 Features Using Email:
1. **Notifications** - User notifications and alerts
2. **Course Announcements** - Bulk emails to enrolled students
3. **Email Digests** - Daily/weekly digest emails
4. **Contact Form** - Contact form submissions
5. **Test Emails** - Admin testing functionality

---

## 🚀 Setup Instructions

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section: [https://resend.com/api-keys](https://resend.com/api-keys)
3. Click **Create API Key**
4. Give it a name (e.g., "OECS LearnBoard Production")
5. Select permissions: **Full Access** (or at minimum: **Sending access**)
6. Copy the API key (you'll only see it once!)

### Step 3: Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Required: Your Resend API key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Custom "from" email address
# For testing without domain verification, use:
RESEND_FROM_EMAIL=onboarding@resend.dev

# For production with verified domain, use:
# RESEND_FROM_EMAIL=notifications@oecslearning.org
# or
# RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
```

### Step 4: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🌐 Domain Verification (Production)

### Why Verify Your Domain?

- **Testing mode** (using `onboarding@resend.dev`): Can only send to your Resend account email
- **Verified domain**: Can send to any email address

### How to Verify Your Domain

1. **Add Your Domain**
   - Go to [https://resend.com/domains](https://resend.com/domains)
   - Click **Add Domain**
   - Enter your domain: `oecslearning.org`

2. **Add DNS Records**
   
   Resend will provide you with DNS records to add. You'll need to add these to your DNS provider:

   **SPF Record** (TXT):
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all
   ```

   **DKIM Records** (TXT):
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [Resend will provide this]
   ```

   **DMARC Record** (TXT) - Optional but recommended:
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@oecslearning.org
   ```

3. **Wait for Verification**
   - DNS propagation can take 15 minutes to 48 hours
   - Check verification status in Resend dashboard
   - You'll receive an email when verification is complete

4. **Update Environment Variable**
   ```bash
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
   ```

---

## 🧪 Testing Your Configuration

### Option 1: Admin Test Page (Recommended)

1. Start your development server
2. Navigate to: `http://localhost:3000/admin/test-email`
3. Enter your email address
4. Click **Send Test Email**
5. Check your inbox (and spam folder)

### Option 2: API Endpoint

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "message": "This is a test message"
  }'
```

### Option 3: Direct Code Test

Create a test file `test-email.js`:

```javascript
const { Resend } = require('resend');

const resend = new Resend('your-api-key-here');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<p>Hello from Resend!</p>'
}).then(console.log).catch(console.error);
```

Run: `node test-email.js`

---

## 📊 Rate Limits & Quotas

### Free Tier:
- **100 emails/day**
- **2 requests/second**
- 1 verified domain
- Email logs for 30 days

### Paid Plans:
- Starting at $20/month for 50,000 emails
- Higher rate limits
- Multiple domains
- Longer log retention

### Rate Limiting in Your App:

The application automatically handles rate limiting:
- Bulk emails are sent with 500ms delay between each
- Maximum 100 recipients per batch
- Automatic retry on rate limit errors

---

## 🔍 Troubleshooting

### Error: "Email service not configured"

**Cause**: `RESEND_API_KEY` is not set

**Solution**:
1. Check your `.env.local` file
2. Ensure `RESEND_API_KEY=re_xxxxx` is present
3. Restart your development server

---

### Error: "Domain is not verified"

**Cause**: Using a custom domain that hasn't been verified

**Solutions**:

**Quick Fix (Testing)**:
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Production Fix**:
1. Verify your domain in Resend dashboard
2. Add DNS records to your DNS provider
3. Wait for verification (15-60 minutes)
4. Update `RESEND_FROM_EMAIL` to use your domain

---

### Error: "Can only send testing emails to your own email"

**Cause**: Using test domain (`onboarding@resend.dev`) without verified domain

**Solution**:
- For testing: Send emails only to the email address associated with your Resend account
- For production: Verify your domain (see Domain Verification section)

---

### Error: "Rate limit exceeded"

**Cause**: Sending too many emails too quickly (>2 per second)

**Solution**:
- The app automatically handles this for bulk sends
- For manual sends, add delays between requests
- Consider upgrading to a paid plan for higher limits

---

## 📧 Email Features in Your Application

### 1. Notifications System
**Location**: `/api/notifications/email/send`

**Usage**:
- User notifications
- Assignment reminders
- Grade notifications
- System alerts

### 2. Course Announcements
**Location**: `/api/courses/[id]/announcements`

**Usage**:
- Instructors can send announcements to all enrolled students
- Automatically rate-limited (500ms between emails)
- Supports HTML content

### 3. Email Digests
**Location**: `/api/cron/email-digests`

**Usage**:
- Daily/weekly digest emails
- Summarizes recent activity
- Scheduled via cron job

### 4. Contact Form
**Location**: `/api/contact`

**Usage**:
- Contact form submissions
- Sends to admin email

---

## 🎨 Email Templates

Your application includes a branded email template system:

### Features:
- OECS LearnBoard branding
- Responsive design
- Professional styling
- Template variables support

### Using Templates:

```typescript
import { sendEmail, wrapEmailTemplate } from '@/lib/email-service';

const content = `
  <h1>Welcome to OECS LearnBoard!</h1>
  <p>Hello {{name}},</p>
  <p>Your account has been created successfully.</p>
`;

await sendEmail({
  to: 'student@example.com',
  subject: 'Welcome!',
  html: wrapEmailTemplate(content, { title: 'Welcome' })
});
```

### Template Variables:

Supports `{{variable}}` syntax:

```typescript
import { replaceTemplateVariables } from '@/lib/email-service';

const template = 'Hello {{name}}, your grade is {{grade}}%';
const result = replaceTemplateVariables(template, {
  name: 'John',
  grade: 95
});
// Result: "Hello John, your grade is 95%"
```

---

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
   - Use `.env.local` (already in `.gitignore`)
   - Use environment variables in production

2. **Use environment-specific keys**
   - Development: Test API key
   - Production: Production API key

3. **Verify sender domains**
   - Prevents spoofing
   - Improves deliverability
   - Builds trust with recipients

4. **Monitor email logs**
   - Check Resend dashboard regularly
   - Monitor bounce rates
   - Track delivery issues

---

## 📈 Production Deployment

### Vercel (Current Platform)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
   ```
4. Redeploy your application

### Other Platforms

Set environment variables in your platform's dashboard:
- Heroku: Settings → Config Vars
- Netlify: Site settings → Environment variables
- Railway: Variables tab

---

## 📚 Additional Resources

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Dashboard**: [https://resend.com/overview](https://resend.com/overview)
- **API Reference**: [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- **Domain Verification**: [https://resend.com/docs/dashboard/domains/introduction](https://resend.com/docs/dashboard/domains/introduction)

---

## ✅ Configuration Checklist

- [ ] Created Resend account
- [ ] Generated API key
- [ ] Added `RESEND_API_KEY` to `.env.local`
- [ ] Added `RESEND_FROM_EMAIL` to `.env.local`
- [ ] Restarted development server
- [ ] Tested email sending via `/admin/test-email`
- [ ] (Production) Verified domain in Resend
- [ ] (Production) Added DNS records
- [ ] (Production) Updated environment variables in Vercel
- [ ] (Production) Tested production email sending

---

## 🆘 Need Help?

If you encounter issues:

1. Check the [Resend Status Page](https://status.resend.com/)
2. Review Resend logs in your dashboard
3. Check the browser console for errors
4. Review server logs for detailed error messages
5. Contact Resend support: [https://resend.com/support](https://resend.com/support)

---

**Last Updated**: December 5, 2024
