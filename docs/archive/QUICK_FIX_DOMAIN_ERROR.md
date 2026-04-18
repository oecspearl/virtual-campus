# Quick Fix: Domain Not Verified Error

## Error Message
```
The oecslearning.org domain is not verified. Please, add and verify your domain on https://resend.com/domains
```

## ⚡ Quick Fix (For Testing Now)

You can test emails immediately without verifying your domain by using Resend's test domain:

### Step 1: Update Environment Variable

In your `.env.local` file (or Heroku config), change:

```env
# Change from:
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>

# To:
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Step 2: Restart Your Server

```bash
# Stop server (Ctrl+C) and restart
npm run dev
```

### Step 3: Test Again

Go to `/admin/test-email` and send a test email - it should work now!

---

## 🚀 Production Fix (When Ready)

For production, you should verify your domain:

### Step 1: Add Domain in Resend

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter: `oecslearning.org`
4. Copy the DNS records provided

### Step 2: Add DNS Records

Add these records to your DNS provider (wherever `oecslearning.org` DNS is managed):

**Example records (check Resend for exact values):**

1. **SPF Record (TXT):**
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all
   ```

2. **DKIM Records (CNAME or TXT):**
   - Resend will show you 2-3 DKIM records
   - Add each one exactly as shown

### Step 3: Wait for Verification

- DNS propagation: 15-60 minutes (usually)
- Check Resend dashboard for verification status
- Status will change to "Verified" ✅

### Step 4: Update Environment Variable

Once verified, update back to your domain:

```env
RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
```

---

## Summary

**Right Now (Testing):**
- ✅ Use `onboarding@resend.dev` - works immediately
- ✅ No DNS configuration needed
- ✅ Good for development/testing

**Later (Production):**
- ✅ Verify `oecslearning.org` in Resend
- ✅ Add DNS records
- ✅ Use `notifications@oecslearning.org`

---

## Test Domain vs Verified Domain

| Feature | Test Domain (`onboarding@resend.dev`) | Verified Domain (`notifications@oecslearning.org`) |
|---------|---------------------------------------|-----------------------------------------------------|
| Setup Time | Immediate | 15-60 minutes |
| DNS Config | None | Required |
| Professional | No | Yes |
| Deliverability | Good | Better |
| Best For | Testing/Dev | Production |

---

**Recommendation:** Use test domain now to get working, then verify domain when ready for production.

