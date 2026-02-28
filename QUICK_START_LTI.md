# Quick Start: LTI 1.3 & OneRoster

Follow these steps to get LTI 1.3 and OneRoster working in your LMS.

## Step 1: Run Database Migration (5 minutes)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Open the file `database/lti-oneroster-schema.sql` in your project
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

✅ **Verify**: Check that the tables were created by running:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'lti%' OR table_name LIKE 'oneroster%';
```

You should see 13 new tables.

---

## Step 2: Generate Platform Keys (5 minutes)

You need RSA keys for LTI platform authentication. Choose one method:

### Option A: Using Node.js (Recommended)

Create a file `generate-keys.js`:

```javascript
const crypto = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('=== PUBLIC KEY ===');
console.log(publicKey);
console.log('\n=== PRIVATE KEY ===');
console.log(privateKey);

// Save to files (optional)
fs.writeFileSync('lti-platform-public.pem', publicKey);
fs.writeFileSync('lti-platform-private.pem', privateKey);
console.log('\n✅ Keys saved to lti-platform-public.pem and lti-platform-private.pem');
```

Run it:
```bash
node generate-keys.js
```

**⚠️ IMPORTANT**: Save both keys securely. The private key should NEVER be shared or committed to git.

### Option B: Using OpenSSL

```bash
# Generate private key
openssl genrsa -out lti-platform-private.pem 2048

# Generate public key
openssl rsa -in lti-platform-private.pem -pubout -out lti-platform-public.pem
```

---

## Step 3: Configure LTI Platform (5 minutes)

1. Get your domain (e.g., `https://your-app.vercel.app` or `https://yourdomain.com`)
2. Open **Supabase SQL Editor**
3. Run this SQL (replace the placeholders):

```sql
INSERT INTO lti_platform_config (
  issuer,
  platform_public_key,
  platform_private_key,
  authorization_server,
  token_endpoint,
  jwks_uri
) VALUES (
  'https://YOUR-DOMAIN-HERE',  -- ⚠️ Replace with your actual domain
  '-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----',  -- ⚠️ Paste your public key
  '-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----',  -- ⚠️ Paste your private key
  'https://YOUR-DOMAIN-HERE/api/lti/token',  -- ⚠️ Replace with your domain
  'https://YOUR-DOMAIN-HERE/api/lti/token',  -- ⚠️ Replace with your domain
  'https://YOUR-DOMAIN-HERE/api/lti/jwks'    -- ⚠️ Replace with your domain
);
```

**Example** (if your domain is `https://oecs-lms.vercel.app`):
```sql
INSERT INTO lti_platform_config (
  issuer,
  platform_public_key,
  platform_private_key,
  authorization_server,
  token_endpoint,
  jwks_uri
) VALUES (
  'https://oecs-lms.vercel.app',
  '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
...your key here...
-----END PUBLIC KEY-----',
  '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...your key here...
-----END PRIVATE KEY-----',
  'https://oecs-lms.vercel.app/api/lti/token',
  'https://oecs-lms.vercel.app/api/lti/token',
  'https://oecs-lms.vercel.app/api/lti/jwks'
);
```

✅ **Verify**: Check the config was saved:
```sql
SELECT issuer, authorization_server FROM lti_platform_config;
```

---

## Step 4: Test with LTI 1.3 Test Tool (10 minutes)

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Register a test tool**:
   - Go to `http://localhost:3000/admin/lti-tools`
   - Click **"Add LTI Tool"**
   - Fill in:
     - **Tool Name**: `LTI 1.3 Test Tool`
     - **Client ID**: `test-client-123`
     - **Tool URL**: `https://lti-ri.imsglobal.org`
     - **Launch URL**: `https://lti-ri.imsglobal.org/lti/tools/12345/launches`
     - **Login URL**: `https://lti-ri.imsglobal.org/lti/tools/12345/login`
     - **Deployment ID**: `test-deployment-1`
   - Click **"Add Tool"**

3. **Test the launch** (you'll need to create a test launch endpoint or use the API):
   ```bash
   # Get your auth token first, then:
   curl -X POST http://localhost:3000/api/lti/launch \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "tool_id": "YOUR_TOOL_ID",
       "course_id": "YOUR_COURSE_ID"
     }'
   ```

---

## Step 5: Add LTI Launch Button to Course Page (Optional)

Add a button to launch LTI tools from your course pages:

```typescript
// In your course page component
const launchLTITool = async (toolId: string) => {
  try {
    const response = await fetch('/api/lti/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // Get from your auth system
      },
      body: JSON.stringify({
        tool_id: toolId,
        course_id: courseId,
        return_url: window.location.href
      })
    });
    
    if (response.ok) {
      // The response is an HTML form that auto-submits
      const html = await response.text();
      document.body.innerHTML = html;
    }
  } catch (error) {
    console.error('Failed to launch tool:', error);
  }
};
```

---

## Step 6: OneRoster Setup (When Needed)

OneRoster is for syncing with Student Information Systems. Set it up when you need to integrate with an SIS:

1. **Create a OneRoster client**:
```sql
INSERT INTO oneroster_clients (
  client_id,
  client_secret_hash,  -- Hash this with bcrypt
  name,
  allowed_scopes
) VALUES (
  'sis-client-1',
  '$2b$10$hashed_secret',  -- Use bcrypt to hash your secret
  'Student Information System',
  ARRAY['oneroster.core.readonly']
);
```

2. **Populate OneRoster data**:
   - Organizations (schools/districts)
   - Academic sessions (terms/semesters)
   - Classes (link to your courses)
   - Users (link to your users table)
   - Enrollments (link users to classes)

See `md/LTI_ONEROSTER_SETUP.md` for detailed OneRoster instructions.

---

## Troubleshooting

### Database errors?
- Make sure you ran the migration in Step 1
- Check Supabase logs for specific errors

### Platform config not found?
- Verify the INSERT in Step 3 succeeded
- Check that your domain matches exactly (no trailing slashes)

### Launch not working?
- Check browser console for errors
- Verify the tool is registered and active
- Check server logs in Supabase dashboard
- Ensure your domain is accessible (not localhost for production tools)

### Need help?
- Check `md/LTI_ONEROSTER_SETUP.md` for detailed instructions
- Review Supabase dashboard logs
- Check that all environment variables are set

---

## What's Next?

✅ **You're done with setup!** Now you can:

1. **Register real LTI tools** (Zoom, Turnitin, Khan Academy, etc.)
2. **Add launch buttons** to your course pages
3. **Test grade passback** with tools that support it
4. **Set up OneRoster** when you need SIS integration

## Quick Reference

- **Admin UI**: `/admin/lti-tools`
- **Launch API**: `POST /api/lti/launch`
- **Token Endpoint**: `/api/lti/token`
- **JWKS Endpoint**: `/api/lti/jwks`
- **Grade Passback**: `POST /api/lti/grade-passback`

For detailed documentation, see:
- `md/LTI_ONEROSTER_SETUP.md` - Complete setup guide
- `md/LTI_ONEROSTER_IMPLEMENTATION.md` - Technical details

