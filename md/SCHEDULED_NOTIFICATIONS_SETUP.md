# Scheduled Notifications Setup Guide

## ✅ What's Implemented

All four notification features are now implemented:

1. ✅ **Assignment Due Reminders** - Scheduled job to send reminders
2. ✅ **Course Announcements** - Auto-notify when instructor posts
3. ✅ **Discussion Replies** - Auto-notify when someone replies
4. ✅ **Email Digests** - Daily/weekly summaries

---

## 🚀 How to Set Up Scheduled Jobs

### Option 1: Vercel Cron Jobs (Recommended for Vercel)

1. **Create `vercel.json` in project root:**

```json
{
  "crons": [
    {
      "path": "/api/cron/assignment-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/email-digests",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/email-digests?type=weekly",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

**Schedules:**
- `0 8 * * *` = Daily at 8 AM
- `0 8 * * 1` = Weekly on Monday at 8 AM

2. **Add CRON_SECRET (optional but recommended):**

```bash
# In Vercel dashboard → Environment Variables
CRON_SECRET=your-secret-key-here
```

3. **Deploy to Vercel** - Cron jobs will automatically start

---

### Option 2: GitHub Actions (Scheduled Workflows)

1. **Create `.github/workflows/cron-notifications.yml`:**

```yaml
name: Scheduled Notifications

on:
  schedule:
    # Daily at 8 AM UTC
    - cron: '0 8 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  assignment-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Assignment Reminders
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/assignment-reminders" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  
  email-digests-daily:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Digests
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/email-digests?type=daily" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  
  email-digests-weekly:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 8 * * 1' || github.event.inputs.type == 'weekly'
    steps:
      - name: Trigger Weekly Digests
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/email-digests?type=weekly" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

2. **Add GitHub Secrets:**
   - `APP_URL` = Your app URL (e.g., `https://learnboard.oecslearning.org`)
   - `CRON_SECRET` = Secret key for authentication

---

### Option 3: External Cron Service (e.g., cron-job.org)

1. **Go to:** https://cron-job.org (or similar service)

2. **Create 3 jobs:**

**Job 1: Assignment Reminders**
- URL: `https://your-domain.com/api/cron/assignment-reminders`
- Schedule: Daily at 8 AM
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 2: Daily Digests**
- URL: `https://your-domain.com/api/cron/email-digests?type=daily`
- Schedule: Daily at 8 AM
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 3: Weekly Digests**
- URL: `https://your-domain.com/api/cron/email-digests?type=weekly`
- Schedule: Weekly on Monday at 8 AM
- Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

---

### Option 4: Heroku Scheduler

1. **Install Heroku Scheduler addon:**
```bash
heroku addons:create scheduler:standard
```

2. **Configure jobs in Heroku dashboard:**
   - Go to: Resources → Heroku Scheduler

3. **Add jobs:**
   ```
   Job 1: curl -X GET https://your-app.herokuapp.com/api/cron/assignment-reminders -H "Authorization: Bearer YOUR_SECRET"
   Schedule: Daily at 8:00 AM UTC
   
   Job 2: curl -X GET "https://your-app.herokuapp.com/api/cron/email-digests?type=daily" -H "Authorization: Bearer YOUR_SECRET"
   Schedule: Daily at 8:00 AM UTC
   
   Job 3: curl -X GET "https://your-app.herokuapp.com/api/cron/email-digests?type=weekly" -H "Authorization: Bearer YOUR_SECRET"
   Schedule: Weekly on Monday at 8:00 AM UTC
   ```

4. **Set CRON_SECRET:**
```bash
heroku config:set CRON_SECRET=your-secret-key-here
```

---

## 🔒 Security: CRON_SECRET

**Optional but recommended** - Protects your cron endpoints from unauthorized access.

**Set environment variable:**
```bash
# Local
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local

# Heroku
heroku config:set CRON_SECRET=$(openssl rand -hex 32)

# Vercel
# Add in dashboard → Settings → Environment Variables
```

**Then configure your cron service to include header:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

---

## 🧪 Testing Cron Jobs

### Manual Testing (without schedule):

```bash
# Assignment reminders
curl http://localhost:3000/api/cron/assignment-reminders

# Daily digests
curl "http://localhost:3000/api/cron/email-digests?type=daily"

# Weekly digests
curl "http://localhost:3000/api/cron/email-digests?type=weekly"
```

### With Authentication:
```bash
curl http://localhost:3000/api/cron/assignment-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 What Each Cron Job Does

### 1. Assignment Reminders (`/api/cron/assignment-reminders`)
- Finds assignments due in next 2 days
- Gets all enrolled students
- Sends reminder emails based on user preferences
- Respects `assignment_due_reminder` notification preferences

### 2. Daily Digests (`/api/cron/email-digests?type=daily`)
- Finds users with `digest_frequency = 'daily'`
- Collects notifications from last 24 hours
- Groups by type (grades, announcements, etc.)
- Sends one summary email

### 3. Weekly Digests (`/api/cron/email-digests?type=weekly`)
- Finds users with `digest_frequency = 'weekly'`
- Collects notifications from last 7 days
- Groups by type
- Sends one summary email

---

## ✅ Already Working (No Setup Needed)

### Course Announcements
- ✅ Automatically sends when instructor/admin creates discussion
- ✅ Also sends if discussion is pinned
- ✅ Sends to all enrolled students

### Discussion Replies
- ✅ Automatically sends when someone replies
- ✅ Notifies discussion author
- ✅ Notifies parent reply author (for nested replies)
- ✅ Notifies other participants (up to 10)

---

## 📋 User Preferences

Users can control all notifications at: `/profile/notifications`

**Per-notification settings:**
- Enable/disable email notifications
- Enable/disable in-app notifications
- Assignment reminder days before (1, 2, 3, etc.)

**Digest settings:**
- `none` = No digests, immediate notifications
- `daily` = Daily summary at 8 AM
- `weekly` = Weekly summary on Monday at 8 AM

---

## 🔍 Monitoring

### Check Digest Logs:
```sql
SELECT * FROM email_digests 
ORDER BY created_at DESC 
LIMIT 20;
```

### Check Notification Logs:
```sql
SELECT type, status, COUNT(*) 
FROM email_notifications 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, status;
```

### Check Assignment Reminders Sent:
```sql
SELECT * FROM email_notifications 
WHERE type = 'assignment_due_reminder'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📝 Summary

**Setup Required:**
1. Choose a cron service (Vercel, GitHub Actions, external, or Heroku)
2. Configure scheduled jobs
3. Set `CRON_SECRET` (optional but recommended)
4. Deploy/configure

**Already Working:**
- ✅ Course announcements (auto-triggered)
- ✅ Discussion replies (auto-triggered)

**Needs Scheduling:**
- ⚙️ Assignment reminders (needs cron job)
- ⚙️ Email digests (needs cron job)

---

**That's it! Your notification system is complete!** 🎉

