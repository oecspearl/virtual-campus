# LTI 1.3 and OneRoster Setup Guide

This guide will help you set up Learning Tools Interoperability (LTI) 1.3 and OneRoster standards in your LMS.

## Overview

### LTI 1.3 (Learning Tools Interoperability)
LTI 1.3 allows your LMS to securely launch external tools (Zoom, Turnitin, Khan Academy, Pearson, etc.) and receive grades back automatically.

### OneRoster
OneRoster enables syncing class rosters, users, and grades with Student Information Systems (SIS).

## Prerequisites

1. Database schema must be created
2. RSA key pair for LTI platform (will be generated)
3. Admin access to configure tools

## Step 1: Database Setup

Run the database schema migration:

```sql
-- Run this in your Supabase SQL Editor
\i database/lti-oneroster-schema.sql
```

Or copy and paste the contents of `database/lti-oneroster-schema.sql` into the Supabase SQL Editor.

## Step 2: Generate LTI Platform Keys

You need to generate an RSA key pair for your LTI platform. You can do this using OpenSSL:

```bash
# Generate private key
openssl genrsa -out lti-platform-private.pem 2048

# Generate public key
openssl rsa -in lti-platform-private.pem -pubout -out lti-platform-public.pem
```

Or use Node.js:

```javascript
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('Public Key:', publicKey);
console.log('Private Key:', privateKey);
```

## Step 3: Configure LTI Platform

Insert your platform configuration into the database:

```sql
INSERT INTO lti_platform_config (
  issuer,
  platform_public_key,
  platform_private_key,
  authorization_server,
  token_endpoint,
  jwks_uri
) VALUES (
  'https://your-domain.com',  -- Your platform's issuer URL
  '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----',  -- Your public key
  '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',  -- Your private key
  'https://your-domain.com/api/lti/token',  -- OAuth token endpoint
  'https://your-domain.com/api/lti/token',  -- Same as above
  'https://your-domain.com/api/lti/jwks'    -- JWKS endpoint
);
```

**Important:** Replace `https://your-domain.com` with your actual domain.

## Step 4: Register LTI Tools

### Via Admin UI

1. Navigate to `/admin/lti-tools`
2. Click "Add LTI Tool"
3. Fill in the tool information:
   - **Tool Name**: Display name (e.g., "Zoom", "Turnitin")
   - **Client ID**: Provided by the tool vendor
   - **Tool URL**: Base URL of the tool
   - **Launch URL**: URL where the tool receives launches
   - **Login URL**: OIDC login initiation URL (if provided)
   - **OIDC Login URL**: OIDC login endpoint (if different from login URL)
   - **Deployment ID**: Deployment identifier (if provided)
   - **Keyset URL**: URL to fetch tool's public keys (if provided)

### Via API

```bash
POST /api/admin/lti-tools
{
  "name": "Zoom",
  "client_id": "zoom-client-id",
  "tool_url": "https://zoom.us",
  "launch_url": "https://zoom.us/lti/launch",
  "login_url": "https://zoom.us/lti/login",
  "deployment_id": "zoom-deployment-1"
}
```

## Step 5: Launch LTI Tools

### From Course/Class Context

```javascript
// In your course or class page
const launchLTITool = async (toolId, courseId) => {
  const response = await fetch('/api/lti/launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tool_id: toolId,
      course_id: courseId,
      return_url: window.location.href
    })
  });
  
  // The response is an HTML form that auto-submits to the tool
  document.body.innerHTML = await response.text();
};
```

### Direct Launch URL

```
POST /api/lti/launch
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "tool_id": "uuid-of-tool",
  "course_id": "uuid-of-course",
  "return_url": "https://your-domain.com/course/123"
}
```

## Step 6: Grade Passback

LTI tools can send grades back to your LMS automatically. The grade passback endpoint is:

```
POST /api/lti/grade-passback
Authorization: Bearer <tool-access-token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "scoreGiven": 85,
  "scoreMaximum": 100,
  "comment": "Great work!",
  "activityProgress": "Completed",
  "gradingProgress": "FullyGraded",
  "assignmentId": "assignment-uuid"
}
```

## OneRoster Setup

### Step 1: Create OneRoster API Client

OneRoster uses OAuth 1.0 for authentication. Create a client:

```sql
INSERT INTO oneroster_clients (
  client_id,
  client_secret_hash,
  name,
  description,
  allowed_scopes
) VALUES (
  'sis-client-1',
  '$2b$10$hashed_secret_here',  -- Hash the secret using bcrypt
  'Student Information System',
  'Main SIS integration',
  ARRAY['oneroster.core.readonly', 'oneroster.gradebook.readwrite']
);
```

### Step 2: Sync Organizations

Organizations represent schools, districts, or institutions:

```sql
INSERT INTO oneroster_organizations (
  sourced_id,
  name,
  type,
  identifier
) VALUES (
  'org-001',
  'OECS School District',
  'district',
  'OECS-DIST-001'
);
```

### Step 3: Sync Academic Sessions

Academic sessions represent terms, semesters, or academic periods:

```sql
INSERT INTO oneroster_academic_sessions (
  sourced_id,
  title,
  start_date,
  end_date,
  type,
  school_year
) VALUES (
  'session-2024-spring',
  'Spring 2024',
  '2024-01-15',
  '2024-05-31',
  'semester',
  '2024'
);
```

### Step 4: Link Users

Link your LMS users to OneRoster sourced IDs:

```sql
INSERT INTO oneroster_users (
  sourced_id,
  lms_user_id,
  username,
  given_name,
  family_name,
  email,
  role
) VALUES (
  'user-001',
  'uuid-from-users-table',
  'jdoe',
  'John',
  'Doe',
  'john.doe@example.com',
  'student'
);
```

### Step 5: Sync Classes

Link courses to OneRoster classes:

```sql
INSERT INTO oneroster_classes (
  sourced_id,
  title,
  class_code,
  course_sourced_id,
  school_sourced_id,
  term_sourced_ids,
  lms_course_id
) VALUES (
  'class-001',
  'Mathematics 101',
  'MATH-101',
  'course-001',
  'org-001',
  ARRAY['session-2024-spring'],
  'uuid-from-courses-table'
);
```

### Step 6: Sync Enrollments

Link users to classes:

```sql
INSERT INTO oneroster_enrollments (
  sourced_id,
  user_sourced_id,
  class_sourced_id,
  role,
  primary_flag
) VALUES (
  'enrollment-001',
  'user-001',
  'class-001',
  'student',
  true
);
```

## OneRoster API Endpoints

Your LMS now exposes the following OneRoster endpoints:

- `GET /api/oneroster/orgs` - List organizations
- `GET /api/oneroster/classes` - List classes
- `GET /api/oneroster/users` - List users
- `GET /api/oneroster/enrollments` - List enrollments

All endpoints require OAuth 1.0 authentication.

## Testing

### Test LTI Launch

1. Register a test tool (or use a tool like [LTI 1.3 Test Tool](https://lti-ri.imsglobal.org/))
2. Navigate to a course page
3. Click "Launch Tool" button
4. Verify the tool receives the launch request correctly

### Test Grade Passback

1. Launch a tool that supports grade passback
2. Complete an activity in the tool
3. Verify the grade appears in your LMS gradebook

### Test OneRoster

1. Use a OneRoster client (like Postman with OAuth 1.0)
2. Authenticate using your client credentials
3. Query the OneRoster endpoints
4. Verify data is returned correctly

## Security Considerations

1. **Keep Private Keys Secure**: Never commit private keys to version control
2. **Use HTTPS**: All LTI and OneRoster endpoints must use HTTPS
3. **Validate Signatures**: Always validate JWT signatures and OAuth signatures
4. **Rate Limiting**: Consider implementing rate limiting on API endpoints
5. **Audit Logging**: All LTI launches and grade passbacks are logged in the database

## Troubleshooting

### LTI Launch Fails

- Check that the tool is registered and active
- Verify the launch URL is correct
- Check browser console for errors
- Verify JWT is being generated correctly

### Grade Passback Not Working

- Verify the tool has the correct access token
- Check that the access token has the grade passback scope
- Verify the assignment ID exists in your database
- Check server logs for errors

### OneRoster Authentication Fails

- Verify OAuth 1.0 signature is correct
- Check that the client is active
- Verify the client secret hash matches
- Check timestamp and nonce are valid

## Additional Resources

- [LTI 1.3 Specification](https://www.imsglobal.org/spec/lti/v1p3/)
- [OneRoster 1.1 Specification](https://www.imsglobal.org/activity/onerosterv1p1)
- [LTI Advantage](https://www.imsglobal.org/activity/learning-tools-interoperability)

## Support

For issues or questions, check the logs in your Supabase dashboard or contact your system administrator.

