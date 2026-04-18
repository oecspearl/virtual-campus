# LTI 1.3 Platform Configuration Information

This document provides all the information needed to configure your LMS as an LTI 1.3 Platform for external tools.

> **Note**: Your LMS also supports being **launched as an LTI Tool** from external platforms (Canvas, Blackboard, Moodle). See `md/LTI_TOOL_CONSUMER_SETUP.md` for details.

## 📋 LTI Version

**Version**: **LTI 1.3** (specifically 1.3.0)

Your LMS implements the full LTI 1.3 specification, including:
- OIDC Login Flow
- JWT-based launch messages
- OAuth 2.0 token exchange
- Grade passback (via Assignment and Grade Services)
- Deep linking support

---

## 🔗 Launch URL

The launch URL is the same for all courses. It's the endpoint where external LTI tools receive launch requests from your LMS.

### Launch URL Format

```
https://lms.oecslearninghub.org/api/lti/launch
```

**Note**: Replace `lms.oecslearninghub.org` with your actual production domain (e.g., `https://oecs-lms.vercel.app` or your custom domain).

### How It Works

1. When a user clicks to launch an LTI tool from a course, the LMS:
   - Authenticates the user
   - Creates a signed JWT with course context
   - POSTs the JWT to `/api/lti/launch`
   - The endpoint returns an auto-submitting HTML form that sends the JWT to the tool's launch URL

2. **Course Context**: The launch includes course information automatically:
   - Course ID (as `context_id`)
   - Course Title (as `context_title`)
   - Course Subject Area (as `context_label`)

### Example Launch URLs

- **Development**: `http://localhost:3000/api/lti/launch`
- **Production**: `https://lms.oecslearninghub.org/api/lti/launch`

---

## 🔑 Public Key / JWK Set URL

The JWK Set URL provides the public keys that external tools use to verify JWT tokens signed by your LMS.

### JWK Set URL Format

```
https://lms.oecslearninghub.org/api/lti/jwks
```

### Current Configuration

To get your current platform configuration, run this SQL query in Supabase:

```sql
SELECT 
  issuer,
  jwks_uri,
  authorization_server,
  token_endpoint
FROM lti_platform_config;
```

### Public Key Information

The JWK Set endpoint (`/api/lti/jwks`) returns a JSON Web Key Set in this format:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "lti-platform-key",
      "alg": "RS256",
      "n": "...",
      "e": "..."
    }
  ]
}
```

**Key ID**: `lti-platform-key`  
**Algorithm**: `RS256`  
**Key Type**: `RSA`

### How to Get Your Public Key

1. **Via API** (Recommended):
   ```bash
   curl https://lms.oecslearninghub.org/api/lti/jwks
   ```

2. **Via Database**:
   ```sql
   SELECT platform_public_key FROM lti_platform_config;
   ```

---

## 🆔 Client ID and Deployment ID

### Important: These are Per-Tool, Not Per-Course

**Client ID** and **Deployment ID** are configured for each external LTI tool you register, not for each course. Each tool (Zoom, Turnitin, Khan Academy, etc.) has its own Client ID and Deployment ID.

### How to Get Client IDs and Deployment IDs

#### Option 1: Via Admin UI

1. Navigate to `/admin/lti-tools`
2. View the list of registered tools
3. Each tool displays its `client_id` and `deployment_id` (if configured)

#### Option 2: Via API

```bash
GET /api/admin/lti-tools
```

Response includes all tools with their `client_id` and `deployment_id`:

```json
[
  {
    "id": "uuid",
    "name": "Zoom",
    "client_id": "zoom-client-123",
    "deployment_id": "zoom-deployment-1",
    "launch_url": "https://zoom.us/lti/launch",
    "status": "active"
  },
  {
    "id": "uuid",
    "name": "Turnitin",
    "client_id": "turnitin-client-456",
    "deployment_id": "turnitin-deployment-1",
    "launch_url": "https://turnitin.com/lti/launch",
    "status": "active"
  }
]
```

#### Option 3: Via Database Query

```sql
SELECT 
  id,
  name,
  client_id,
  deployment_id,
  launch_url,
  status
FROM lti_tools
WHERE status = 'active'
ORDER BY name;
```

### Default Deployment ID

If a tool doesn't have a `deployment_id` configured, the system uses `'default'` as the deployment ID in LTI launch messages.

---

## 📝 Complete Platform Configuration for External Tools

When registering your LMS as a platform in external tools (Zoom, Turnitin, etc.), provide them with:

### Required Information

1. **Platform Issuer** (Platform Identifier):
   ```
   https://lms.oecslearninghub.org
   ```
   - Get from: `SELECT issuer FROM lti_platform_config;`

2. **Authorization Server**:
   ```
   https://lms.oecslearninghub.org/api/lti/token
   ```

3. **Token Endpoint**:
   ```
   https://lms.oecslearninghub.org/api/lti/token
   ```
   (Same as Authorization Server)

4. **JWKS URL** (Public Key Set):
   ```
   https://lms.oecslearninghub.org/api/lti/jwks
   ```

5. **OIDC Login Initiation URL**:
   ```
   https://lms.oecslearninghub.org/api/lti/oidc-login
   ```

6. **Redirect URIs** (if required by tool):
   ```
   https://lms.oecslearninghub.org/api/lti/oidc-login
   ```

### Example Configuration

If your domain is `https://oecs-lms.vercel.app`:

```
Platform Issuer: https://oecs-lms.vercel.app
Authorization Server: https://oecs-lms.vercel.app/api/lti/token
Token Endpoint: https://oecs-lms.vercel.app/api/lti/token
JWKS URL: https://oecs-lms.vercel.app/api/lti/jwks
OIDC Login URL: https://oecs-lms.vercel.app/api/lti/oidc-login
```

---

## 🔍 How to Find Your Current Domain/Issuer

### Method 1: Check Database

```sql
SELECT issuer FROM lti_platform_config;
```

### Method 2: Check Environment Variables

Your domain should match:
- `NEXT_PUBLIC_APP_URL` (if set)
- Or your Vercel deployment URL

### Method 3: Check Vercel Dashboard

1. Go to your Vercel project
2. Check the **Domains** section
3. Use your production domain

---

## 📊 Summary Table

| Configuration Item | Format | Example |
|-------------------|--------|---------|
| **LTI Version** | 1.3.0 | Fixed |
| **Launch URL** | `https://DOMAIN/api/lti/launch` | `https://oecs-lms.vercel.app/api/lti/launch` |
| **JWK Set URL** | `https://DOMAIN/api/lti/jwks` | `https://oecs-lms.vercel.app/api/lti/jwks` |
| **Platform Issuer** | `https://DOMAIN` | `https://oecs-lms.vercel.app` |
| **Token Endpoint** | `https://DOMAIN/api/lti/token` | `https://oecs-lms.vercel.app/api/lti/token` |
| **OIDC Login URL** | `https://DOMAIN/api/lti/oidc-login` | `https://oecs-lms.vercel.app/api/lti/oidc-login` |
| **Client ID** | Per-tool (from `lti_tools` table) | `zoom-client-123` |
| **Deployment ID** | Per-tool (from `lti_tools` table) | `zoom-deployment-1` |

---

## 🛠️ Quick Reference SQL Queries

### Get Platform Configuration
```sql
SELECT * FROM lti_platform_config;
```

### Get All Active LTI Tools with Client IDs
```sql
SELECT 
  name,
  client_id,
  deployment_id,
  launch_url,
  status
FROM lti_tools
WHERE status = 'active'
ORDER BY name;
```

### Get Public Key (PEM format)
```sql
SELECT platform_public_key FROM lti_platform_config;
```

### Get JWK Set (via API)
```bash
curl https://lms.oecslearninghub.org/api/lti/jwks | jq
```

---

## ⚠️ Important Notes

1. **HTTPS Required**: In production, all URLs must use HTTPS. LTI 1.3 requires secure connections.

2. **Domain Consistency**: Ensure your `issuer` in `lti_platform_config` matches your actual production domain.

3. **Client ID vs Platform Issuer**:
   - **Platform Issuer**: Your LMS's identifier (one per platform)
   - **Client ID**: Each external tool's identifier (one per tool)

4. **Deployment ID**: Optional but recommended. If not provided, defaults to `'default'`.

5. **Launch URL is Universal**: The same launch URL (`/api/lti/launch`) is used for all courses. Course context is included in the JWT payload.

---

## 📞 Need Help?

- Check the LTI integration guides: `md/LTI_INTEGRATION_GUIDES.md`
- Review the quick start: `QUICK_START_LTI.md`
- Check the database schema: `database/lti-oneroster-schema.sql`

