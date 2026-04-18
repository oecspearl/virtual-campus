# Resend Domain Setup Guide

## Do I Need to Add a Domain to Resend?

### Short Answer: **It depends**

- **For Testing/Development**: No - you can use Resend's test domain
- **For Production**: Yes - you should verify your domain for better deliverability

---

## Option 1: Use Resend Test Domain (Quick Start) ✅

**Best for:** Development, testing, getting started quickly

1. **No domain verification needed**
2. **Use this in your `.env`:**
   ```env
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

3. **Pros:**
   - ✅ Works immediately
   - ✅ No DNS configuration
   - ✅ Good for testing
   - ✅ Free tier works

4. **Cons:**
   - ❌ Shows "onboarding@resend.dev" as sender
   - ❌ Not ideal for production
   - ❌ May have deliverability issues

---

## Option 2: Verify Your Domain (Production) 🚀

**Best for:** Production, professional emails, better deliverability

### Step-by-Step:

1. **Add Domain in Resend**
   - Go to: https://resend.com/domains
   - Click "Add Domain"
   - Enter: `oecslearning.org` (or your domain)

2. **Get DNS Records**
   Resend will show you DNS records like:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all
   
   Type: CNAME
   Name: resend._domainkey
   Value: resend._domainkey.oecslearning.org.dkim.resend.com
   
   (Plus 2 more DKIM records)
   ```

3. **Add to Your DNS Provider**
   - Go to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap)
   - Add each record exactly as shown
   - Save changes

4. **Wait for Propagation**
   - DNS changes can take 5 minutes to 72 hours
   - Usually verified within 1-2 hours

5. **Verify in Resend**
   - Return to Resend dashboard
   - Click "Verify" or wait for auto-verification
   - Status should show "Verified" ✅

6. **Update Your Environment Variable**
   ```env
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
   ```
   Or any subdomain:
   ```env
   RESEND_FROM_EMAIL=noreply@oecslearning.org
   ```

---

## Which Should I Choose?

### Choose Test Domain If:
- ✅ Just getting started
- ✅ Testing the email system
- ✅ Development environment
- ✅ Need to work quickly

### Choose Domain Verification If:
- ✅ Production environment
- ✅ Want professional sender address
- ✅ Need better email deliverability
- ✅ Sending to real users
- ✅ Want to avoid spam filters

---

## Common Issues

### "Domain not verified" Error

**Problem:** Trying to send from `notifications@oecslearning.org` but domain not verified

**Solutions:**
1. Use `onboarding@resend.dev` for testing
2. Verify your domain first (Option 2 above)
3. Wait for DNS propagation

### "Unauthorized domain" Error

**Problem:** Resend rejects your `from` address

**Solution:** Make sure:
- Domain is verified in Resend
- `from` email matches verified domain
- DNS records are correct

### DNS Records Not Working

**Check:**
1. Records added exactly as Resend shows
2. No typos in record values
3. DNS provider has saved changes
4. Wait 15-60 minutes for propagation
5. Use `dig` or `nslookup` to verify records

---

## For Your OECS Learning Hub

**Recommended Setup:**

1. **Development:**
   ```env
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

2. **Production:**
   ```env
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
   ```
   - Verify `oecslearning.org` domain in Resend
   - Add DNS records
   - Wait for verification

---

## Testing Without Domain Verification

You can start testing immediately:

```bash
# In .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://learnboard.oecslearning.org
```

Then:
1. Run database migration
2. Test sending an email
3. Check Resend dashboard for sent emails

Later, when ready for production:
1. Add and verify your domain
2. Update `RESEND_FROM_EMAIL` to use your domain
3. Redeploy

---

## Summary

✅ **For now (testing):** Use `onboarding@resend.dev` - no domain needed  
🚀 **For production:** Verify your domain - better deliverability

**You can start working right away without domain verification!**

