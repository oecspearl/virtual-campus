# LTI Tool Consumer Setup Guide

This guide explains how to configure your LMS to be launched as an LTI Tool from external platforms (Canvas, Blackboard, Moodle, etc.).

## Overview

Your LMS now supports being launched as an **LTI Tool** (Consumer) from external platforms. This means:

- External platforms (Canvas, Blackboard, Moodle) can launch your LMS
- Users from those platforms can access your courses without separate login
- User accounts are automatically provisioned from LTI claims
- Course context is preserved from the launching platform

## Architecture

### Launch Flow

1. **External Platform** → Initiates LTI launch
2. **Your LMS** (`/api/lti/tool/launch`) → Receives `id_token` JWT
3. **JWT Validation** → Validates using platform's public key (from JWKS)
4. **User Provisioning** → Creates/finds user from LTI claims
5. **Session Creation** → Creates Supabase session
6. **Redirect** → Redirects to course/dashboard

## Setup Steps

### Step 1: Run Database Migration

Run the database schema to create the necessary tables:

```sql
-- Run this in Supabase SQL Editor
\i database/lti-tool-consumer-schema.sql
```

Or copy and paste the contents of `database/lti-tool-consumer-schema.sql` into the Supabase SQL Editor.

### Step 2: Register External Platform

1. Navigate to `/admin/lti-platforms`
2. Click **"Add Platform"**
3. Fill in the platform information:

#### Required Fields:
- **Platform Name**: Display name (e.g., "Canvas", "Blackboard", "Moodle")
- **Issuer**: Platform's issuer URL (e.g., `https://canvas.instructure.com`)
- **Client ID**: Your client ID on their platform (provided by them)
- **JWKS URI**: URL to fetch platform's public keys (e.g., `https://canvas.instructure.com/api/lti/security/jwks`)
- **Launch URL**: Your launch endpoint URL on their platform (e.g., `https://lms.oecslearninghub.org/api/lti/tool/launch`)

#### Optional Fields:
- **Deployment ID**: Deployment ID on their platform (if required)
- **Authorization Server**: OAuth authorization server URL
- **Token Endpoint**: OAuth token endpoint
- **Platform Public Key**: PEM format public key (will fetch from JWKS if not provided)
- **Auto-provision Users**: Enable automatic user creation from LTI claims
- **Default User Role**: Default role for provisioned users (student/instructor/admin)

### Step 3: Configure on External Platform

You need to register your LMS as an LTI Tool on the external platform. Provide them with:

#### For Canvas:
1. Go to **Account → Settings → Apps → View App Configurations → + App**
2. Select **By URL**
3. Enter:
   - **Name**: OECS Learning Hub
   - **Consumer Key**: (Your Client ID - you'll get this from Canvas)
   - **Shared Secret**: (Not needed for LTI 1.3)
   - **Launch URL**: `https://lms.oecslearninghub.org/api/lti/tool/launch`
   - **Domain**: `lms.oecslearninghub.org`
   - **Privacy**: Public
   - **LTI Version**: 1.3

#### For Blackboard:
1. Go to **Administrator Panel → Integrations → LTI Tool Providers**
2. Click **Create Provider**
3. Enter:
   - **Provider Domain**: `lms.oecslearninghub.org`
   - **Launch URL**: `https://lms.oecslearninghub.org/api/lti/tool/launch`
   - **LTI Version**: 1.3

#### For Moodle:
1. Go to **Site administration → Plugins → Activity modules → External tool → Manage tools**
2. Click **Configure a tool manually**
3. Enter:
   - **Tool name**: OECS Learning Hub
   - **Tool URL**: `https://lms.oecslearninghub.org/api/lti/tool/launch`
   - **LTI version**: LTI 1.3
   - **Public key type**: JWK Set URL
   - **Public JWK Set URL**: `https://lms.oecslearninghub.org/api/lti/jwks`

### Step 4: Get Your Client ID and Deployment ID

After registering on the external platform, they will provide:
- **Client ID**: Your unique identifier on their platform
- **Deployment ID**: (Optional) Deployment identifier

Update your platform registration in `/admin/lti-platforms` with these values.

## Launch URL

Your launch URL for external platforms:

```
https://lms.oecslearninghub.org/api/lti/tool/launch
```

Replace `lms.oecslearninghub.org` with your actual domain.

## User Provisioning

### Auto-Provisioning

When enabled, users are automatically created from LTI claims:
- **Email**: From `email` claim
- **Name**: From `name`, `given_name`, or email prefix
- **Role**: Mapped from LTI roles:
  - `Instructor` → `instructor`
  - `Administrator` → `admin`
  - `ContentDeveloper` → `instructor`
  - Default → `student` (or configured default role)

### Manual Provisioning

If auto-provisioning is disabled:
- Users must already exist in your LMS
- Launch will fail if user email is not found

## Course Context

When launched from a course context:
- **Context ID**: Stored from LTI `context.id` claim
- **Context Title**: Course title from platform
- **Redirect**: Automatically redirects to matching course (if found)

### Course Mapping

Currently, the system tries to match `context_id` with course `id`. For better mapping, you can:
1. Create a mapping table linking external platform course IDs to your course IDs
2. Update the launch endpoint to use this mapping

## Security

### JWT Validation

- JWTs are validated using the platform's public key
- Keys are fetched from the platform's JWKS URL
- Keys are cached in the database for performance
- JWT signature, issuer, audience, and expiration are all validated

### Session Management

- Sessions are created using Supabase magic links
- Session tokens are single-use and expire after 1 hour
- Launch records are stored for audit purposes

## Testing

### Test Launch

1. Register a test platform (e.g., Canvas test instance)
2. Configure the platform with your launch URL
3. Launch from a course on the platform
4. Verify:
   - User is created/authenticated
   - Session is established
   - Redirect to course/dashboard works

### Debugging

Check logs for:
- `[LTI Tool Launch]` - Launch endpoint logs
- `[LTI Tool Consumer]` - JWT validation logs
- `[LTI Tool Auth]` - Session creation logs

## API Endpoints

### Launch Endpoint
- **URL**: `/api/lti/tool/launch`
- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Parameters**:
  - `id_token`: JWT from external platform
  - `state`: (Optional) State parameter

### Session Endpoint
- **URL**: `/api/lti/tool/session`
- **Method**: GET
- **Parameters**:
  - `token`: Session token from launch

### Auth Endpoint
- **URL**: `/api/lti/tool/auth`
- **Method**: GET
- **Parameters**:
  - `user_id`: User ID
  - `token`: Session token
  - `context_id`: (Optional) Course context ID
  - `return_url`: (Optional) Return URL

## Admin UI

Access the admin UI at `/admin/lti-platforms` to:
- View all registered platforms
- Add new platforms
- Edit platform configurations
- Enable/disable platforms
- Delete platforms

## Troubleshooting

### "Platform not registered"
- Ensure the platform issuer URL matches exactly
- Check that the platform status is "active"

### "Invalid or expired launch token"
- Check JWT validation logs
- Verify JWKS URL is accessible
- Ensure platform public keys are valid

### "User not found and auto-provisioning is disabled"
- Enable auto-provisioning in platform settings
- Or manually create the user account

### Session creation fails
- Check Supabase configuration
- Verify user email exists
- Check admin API permissions

## Next Steps

1. **Course Mapping**: Implement mapping between external platform courses and your courses
2. **Grade Passback**: Send grades back to external platforms
3. **Deep Linking**: Support content selection from external platforms
4. **Custom Parameters**: Handle custom LTI parameters for advanced integrations

## Support

For issues or questions:
- Check the logs in Vercel function logs
- Review the database `lti_tool_launches` table for launch records
- Verify platform configuration matches external platform settings



