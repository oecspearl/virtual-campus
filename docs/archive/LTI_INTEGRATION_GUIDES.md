# LTI Integration Guides for Popular Tools

This guide shows you how to integrate specific LTI 1.3 tools with your LMS.

## ✅ What's Ready

Your LMS now has:
- ✅ Full LTI 1.3 implementation
- ✅ Admin UI for managing tools (`/admin/lti-tools`)
- ✅ Launch endpoints
- ✅ Grade passback support
- ✅ OAuth 2.0 authentication

## General Integration Steps

For any LTI 1.3 tool, you need to:

1. **Get tool configuration from vendor** (client_id, launch_url, etc.)
2. **Register tool in your LMS** (via admin UI or API)
3. **Configure your platform in the tool** (provide your platform's issuer, JWKS URL, etc.)
4. **Test the launch**

---

## 🔵 Zoom Integration

### Step 1: Get Zoom LTI Configuration

1. Log into your **Zoom Admin Portal**
2. Go to **Advanced → LTI Pro**
3. Enable **LTI Pro** for your account
4. Create a new **LTI App** or use existing one
5. Note down:
   - **Client ID** (e.g., `abc123xyz`)
   - **Deployment ID** (e.g., `zoom-deployment-1`)
   - **Launch URL** (provided by Zoom)
   - **OIDC Login URL** (provided by Zoom)

### Step 2: Register Zoom in Your LMS

1. Go to `http://localhost:3000/admin/lti-tools`
2. Click **"Add LTI Tool"**
3. Fill in:
   - **Tool Name**: `Zoom`
   - **Client ID**: `[Your Zoom Client ID]`
   - **Tool URL**: `https://zoom.us`
   - **Launch URL**: `[Zoom Launch URL from Step 1]`
   - **Login URL**: `[Zoom OIDC Login URL]`
   - **OIDC Login URL**: `[Same as Login URL or provided separately]`
   - **Deployment ID**: `[Your Zoom Deployment ID]`
4. Click **"Add Tool"**

### Step 3: Configure Your Platform in Zoom

1. In Zoom Admin Portal → LTI App settings
2. Add your platform configuration:
   - **Platform Issuer**: `http://localhost:3000` (or your production domain)
   - **Authorization Server**: `http://localhost:3000/api/lti/token`
   - **Token Endpoint**: `http://localhost:3000/api/lti/token`
   - **JWKS URL**: `http://localhost:3000/api/lti/jwks`
   - **Redirect URIs**: `http://localhost:3000/api/lti/oidc-login`

### Step 4: Launch Zoom from Your Course

Add a button to launch Zoom:

```typescript
// In your course page component
const launchZoom = async () => {
  const response = await fetch('/api/lti/launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tool_id: zoomToolId, // Get this from your lti_tools table
      course_id: currentCourseId,
      return_url: window.location.href
    })
  });
  
  if (response.ok) {
    const html = await response.text();
    document.body.innerHTML = html; // Auto-submits to Zoom
  }
};
```

---

## 📝 Turnitin Integration

### Step 1: Get Turnitin Configuration

1. Contact **Turnitin Support** to enable LTI 1.3
2. They'll provide:
   - **Client ID**
   - **Deployment ID**
   - **Launch URL**
   - **Keyset URL** (for public key verification)

### Step 2: Register Turnitin

1. Go to `/admin/lti-tools`
2. Add tool with Turnitin's configuration
3. **Important**: Turnitin supports grade passback, so grades will automatically sync

### Step 3: Configure Platform in Turnitin

Provide Turnitin with:
- Your platform issuer URL
- JWKS endpoint: `/api/lti/jwks`
- Token endpoint: `/api/lti/token`

---

## 🎓 Khan Academy Integration

### Step 1: Get Khan Academy LTI Info

1. Contact **Khan Academy** for LTI 1.3 access
2. They'll provide client_id and launch URLs

### Step 2: Register in Your LMS

Standard registration via admin UI.

---

## 📚 Pearson Integration

### Step 1: Get Pearson Configuration

1. Log into **Pearson LearningStudio** or contact Pearson
2. Get LTI 1.3 configuration details

### Step 2: Register and Configure

Follow standard LTI registration process.

---

## 🔧 Generic LTI Tool Integration

For any LTI 1.3 compliant tool:

### Information You Need from Tool Vendor:

1. **Client ID** - Unique identifier for your tool registration
2. **Launch URL** - Where the tool receives launch requests
3. **Login URL** (optional) - OIDC login initiation
4. **OIDC Login URL** (optional) - Alternative OIDC endpoint
5. **Deployment ID** (optional) - Deployment identifier
6. **Keyset URL** (optional) - URL to fetch tool's public keys
7. **Redirect URIs** - Where tool can redirect back to

### Information Tool Vendor Needs from You:

1. **Platform Issuer**: `http://localhost:3000` (or your domain)
2. **Authorization Server**: `http://localhost:3000/api/lti/token`
3. **Token Endpoint**: `http://localhost:3000/api/lti/token`
4. **JWKS URL**: `http://localhost:3000/api/lti/jwks`
5. **OIDC Login Initiation**: `http://localhost:3000/api/lti/oidc-login`
6. **Launch URL**: `http://localhost:3000/api/lti/launch` (if tool initiates)

---

## 🧪 Testing with LTI 1.3 Test Tool

Before integrating real tools, test with the official LTI test tool:

### Step 1: Register Test Tool

1. Go to `/admin/lti-tools`
2. Add tool:
   - **Name**: `LTI 1.3 Test Tool`
   - **Client ID**: `test-client-123`
   - **Tool URL**: `https://lti-ri.imsglobal.org`
   - **Launch URL**: `https://lti-ri.imsglobal.org/lti/tools/12345/launches`
   - **Login URL**: `https://lti-ri.imsglobal.org/lti/tools/12345/login`

### Step 2: Configure Test Tool

1. Go to https://lti-ri.imsglobal.org
2. Register your platform with the URLs above
3. Test the launch

---

## 📋 Integration Checklist

For each tool integration:

- [ ] Get tool configuration from vendor
- [ ] Register tool in `/admin/lti-tools`
- [ ] Configure your platform in the tool's admin panel
- [ ] Test launch from a course page
- [ ] Verify user context is passed correctly
- [ ] Test grade passback (if supported)
- [ ] Verify roles are mapped correctly
- [ ] Test with different user roles (student, instructor)

---

## 🔒 Security Notes

1. **Never share your private key** - Keep it secure in the database
2. **Use HTTPS in production** - LTI requires secure connections
3. **Validate all launches** - The system automatically validates JWT signatures
4. **Monitor launch logs** - Check `lti_launches` table for audit trail

---

## 🐛 Troubleshooting

### Launch Fails

- Check tool is registered and active
- Verify client_id matches exactly
- Check launch URL is correct
- Verify platform configuration in tool's admin panel
- Check browser console for errors

### Grade Passback Not Working

- Verify tool has access token with grade passback scope
- Check `lti_grade_passback` table for received grades
- Verify assignment_id exists in your database
- Check server logs for errors

### Authentication Errors

- Verify JWKS endpoint is accessible
- Check token endpoint is working
- Verify keys are correctly stored in database
- Check OAuth signature validation

---

## 📞 Getting Help

- **Tool-specific issues**: Contact the tool vendor's support
- **Platform issues**: Check Supabase logs
- **LTI specification**: https://www.imsglobal.org/spec/lti/v1p3/

---

## 🚀 Production Deployment

When moving to production:

1. **Update domain** in `lti_platform_config`:
   ```sql
   UPDATE lti_platform_config 
   SET issuer = 'https://your-production-domain.com',
       authorization_server = 'https://your-production-domain.com/api/lti/token',
       token_endpoint = 'https://your-production-domain.com/api/lti/token',
       jwks_uri = 'https://your-production-domain.com/api/lti/jwks';
   ```

2. **Update tool registrations** with production URLs
3. **Re-configure tools** with production platform URLs
4. **Test thoroughly** before going live

---

## ✅ Supported Features

Your LTI implementation supports:

- ✅ **Resource Link Launch** - Launch tools from courses
- ✅ **Deep Linking** - Content selection and embedding
- ✅ **Grade Passback** - Automatic grade synchronization
- ✅ **Custom Parameters** - Pass custom data to tools
- ✅ **Role Mapping** - Automatic LMS role → LTI role conversion
- ✅ **OAuth 2.0** - Secure authentication
- ✅ **JWT Security** - Industry-standard token format

All LTI 1.3 compliant tools should work with your implementation!

