# Resend DKIM Setup Guide

## Your DKIM Public Key

Resend provided you with this DKIM public key:
```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1PauRwtQ770xEEzUd9jzObiCGasDdGWxPZBuijSFo+ahlgEQGkl8A0IHyV3+dNz2TaQ3SVYZb6l3LP2pitthNm/84DJR0ChcSeMtvi8TaXpj1USzn/g/KIrz81NNfBn0B7zOviVSXaOR5YMoa6Y0asFoRxDJbL5jCv4ZDqa1X3QIDAQAB
```

## Complete DKIM DNS Record Format

Resend typically requires **3 DKIM records**. You need to check your Resend dashboard for the complete record format, but typically they look like this:

### Example DKIM Records:

1. **First DKIM Record:**
   ```
   Type: CNAME
   Name: resend._domainkey
   Value: resend._domainkey.yourdomain.com.dkim.resend.com
   ```

2. **Second DKIM Record:**
   ```
   Type: CNAME
   Name: [selector]._domainkey  (e.g., s1._domainkey or resend._domainkey)
   Value: [selector].yourdomain.com.dkim.resend.com
   ```

3. **Third DKIM Record (with your public key):**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1PauRwtQ770xEEzUd9jzObiCGasDdGWxPZBuijSFo+ahlgEQGkl8A0IHyV3+dNz2TaQ3SVYZb6l3LP2pitthNm/84DJR0ChcSeMtvi8TaXpj1USzn/g/KIrz81NNfBn0B7zOviVSXaOR5YMoa6Y0asFoRxDJbL5jCv4ZDqa1X3QIDAQAB
   ```

## Important: Check Resend Dashboard

**⚠️ CRITICAL:** The exact DNS record format depends on what Resend shows you. 

1. Go to: https://resend.com/domains
2. Click on your domain (or add it if you haven't)
3. Resend will show you **exact DNS records** to add
4. Copy those records exactly as shown

## Typical Complete DNS Setup for Resend

When you add a domain in Resend, you usually need to add:

### 1. SPF Record (Type: TXT)
```
Type: TXT
Name: @ (or root domain)
Value: v=spf1 include:resend.com ~all
TTL: 3600 (or default)
```

### 2. DKIM Record #1 (Type: CNAME)
```
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.oecslearning.org.dkim.resend.com
```

### 3. DKIM Record #2 (Type: CNAME)
```
Type: CNAME
Name: [selector]._domainkey  (check Resend for exact selector)
Value: [selector].oecslearning.org.dkim.resend.com
```

### 4. DKIM Record #3 (Type: TXT)
```
Type: TXT
Name: resend._domainkey
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1PauRwtQ770xEEzUd9jzObiCGasDdGWxPZBuijSFo+ahlgEQGkl8A0IHyV3+dNz2TaQ3SVYZb6l3LP2pitthNm/84DJR0ChcSeMtvi8TaXpj1USzn/g/KIrz81NNfBn0B7zOviVSXaOR5YMoa6Y0asFoRxDJbL5jCv4ZDqa1X3QIDAQAB
```

## How to Add DNS Records

### If using Cloudflare:
1. Go to Cloudflare Dashboard → DNS
2. Click "Add record"
3. Select record type (CNAME or TXT)
4. Enter Name exactly as Resend shows
5. Enter Value exactly as Resend shows
6. Click Save

### If using GoDaddy:
1. Go to GoDaddy → DNS Management
2. Click "Add" under DNS Records
3. Select Type
4. Enter Name
5. Enter Value
6. Save

### If using Namecheap:
1. Go to Domain List → Manage → Advanced DNS
2. Click "Add New Record"
3. Select Type
4. Enter Host/Name
5. Enter Value
6. Save

## Verification Steps

1. **Add all DNS records** exactly as Resend shows
2. **Wait 15-60 minutes** for DNS propagation
3. **Check DNS propagation:**
   ```bash
   # On Windows (PowerShell)
   nslookup -type=TXT resend._domainkey.oecslearning.org
   
   # On Mac/Linux
   dig TXT resend._domainkey.oecslearning.org
   ```
4. **Verify in Resend:**
   - Go back to Resend dashboard
   - Click "Verify" or wait for auto-verification
   - Status should change to "Verified" ✅

## Common Issues

### "DNS records not found"
- **Wait longer** - DNS can take up to 72 hours (usually 1-2 hours)
- **Check for typos** in record values
- **Verify you added to correct domain** (root vs subdomain)

### "Domain not verified"
- Make sure **all** records are added (SPF + all DKIM records)
- Check DNS provider has saved changes
- Use DNS checker: https://mxtoolbox.com/SuperTool.aspx

### "Record value incorrect"
- Copy/paste directly from Resend dashboard
- Don't modify the values
- Make sure no extra spaces or characters

## Testing After Setup

Once verified:

1. **Update your `.env`:**
   ```env
   RESEND_FROM_EMAIL=OECS LearnBoard <notifications@oecslearning.org>
   ```

2. **Test sending:**
   ```bash
   # Or use the API directly
   curl -X POST http://localhost:3000/api/notifications/email/send \
     -H "Content-Type: application/json" \
     -d '{
       "type": "enrollment_confirmation",
       "emailAddresses": ["test@example.com"],
       "templateVariables": {
         "student_name": "Test",
         "course_title": "Test Course",
         "course_url": "https://learnboard.oecslearning.org"
       }
     }'
   ```

3. **Check Resend dashboard** → Emails section to see if email was sent

## Next Steps

After DNS records are added:

1. ✅ Wait for DNS propagation (15-60 minutes)
2. ✅ Verify domain in Resend dashboard
3. ✅ Update `RESEND_FROM_EMAIL` environment variable
4. ✅ Test sending an email
5. ✅ Check email deliverability in Resend dashboard

## Need Help?

- **Resend Docs:** https://resend.com/docs/dashboard/domains/introduction
- **Resend Support:** Check your Resend dashboard for support options
- **DNS Checker:** https://mxtoolbox.com/ (verify DNS records)

---

**Remember:** Always copy the DNS records **exactly** as shown in your Resend dashboard. The format may differ slightly from these examples.

