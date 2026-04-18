# LTI 1.3 and OneRoster Implementation Summary

## Overview

This implementation adds full support for **LTI 1.3 (Learning Tools Interoperability)** and **OneRoster** standards to your LMS, enabling enterprise-grade integrations with external tools and Student Information Systems (SIS).

## What Was Implemented

### 1. Database Schema (`database/lti-oneroster-schema.sql`)

#### LTI 1.3 Tables:
- **`lti_tools`** - Registered external tools (Zoom, Turnitin, Khan Academy, etc.)
- **`lti_platform_config`** - Platform-level LTI configuration (keys, endpoints)
- **`lti_launches`** - Tracks all LTI launches for audit and session management
- **`lti_grade_passback`** - Stores grades received from external tools
- **`lti_deep_links`** - Deep linking configurations for content selection
- **`lti_access_tokens`** - OAuth 2.0 access tokens for tool communication

#### OneRoster Tables:
- **`oneroster_organizations`** - Schools, districts, institutions
- **`oneroster_academic_sessions`** - Terms, semesters, academic periods
- **`oneroster_classes`** - Course sections/classes
- **`oneroster_users`** - Links LMS users to OneRoster sourced IDs
- **`oneroster_enrollments`** - Links users to classes
- **`oneroster_lineitems`** - Assignments/gradebook items
- **`oneroster_results`** - Grades/scores
- **`oneroster_clients`** - OAuth client credentials for SIS systems

All tables include:
- Row-Level Security (RLS) policies
- Proper indexes for performance
- Foreign key constraints
- Timestamp tracking

### 2. LTI 1.3 Core Library (`lib/lti/`)

#### `core.ts` - Core LTI functionality:
- JWT generation and validation
- Platform configuration management
- Tool registration and retrieval
- Role mapping (LMS roles → LTI roles)
- Launch JWT creation with full LTI 1.3 claims
- Access token generation

#### `oauth.ts` - OAuth 2.0 implementation:
- OAuth token request handling
- Client assertion validation
- Access token validation
- Scope management

### 3. LTI API Endpoints (`app/api/lti/`)

- **`/api/lti/launch`** (POST) - Launch LTI tools from courses/classes
- **`/api/lti/oidc-login`** (GET) - OIDC login initiation
- **`/api/lti/token`** (POST) - OAuth 2.0 token endpoint
- **`/api/lti/grade-passback`** (POST) - Receive grades from tools
- **`/api/lti/jwks`** (GET) - JSON Web Key Set for JWT verification

### 4. OneRoster API Endpoints (`app/api/oneroster/`)

- **`/api/oneroster/orgs`** (GET) - List organizations
- **`/api/oneroster/classes`** (GET) - List classes
- **`/api/oneroster/users`** (GET) - List users
- **`/api/oneroster/enrollments`** (GET) - List enrollments

All endpoints:
- Use OAuth 1.0 authentication
- Support filtering, sorting, pagination
- Return OneRoster-compliant JSON

### 5. Admin UI (`app/admin/lti-tools/`)

- **`/admin/lti-tools`** - Full CRUD interface for managing LTI tools
- Features:
  - Add/Edit/Delete tools
  - Activate/Deactivate tools
  - View tool configurations
  - Client ID management

### 6. Admin API (`app/api/admin/lti-tools/`)

- **`GET /api/admin/lti-tools`** - List all tools
- **`POST /api/admin/lti-tools`** - Create new tool
- **`GET /api/admin/lti-tools/[id]`** - Get tool by ID
- **`PUT /api/admin/lti-tools/[id]`** - Update tool
- **`DELETE /api/admin/lti-tools/[id]`** - Delete tool

## Key Features

### LTI 1.3 Features:
✅ **Resource Link Launch** - Launch external tools from courses
✅ **Deep Linking** - Content selection and embedding
✅ **Grade Passback** - Automatic grade synchronization
✅ **OAuth 2.0** - Secure tool authentication
✅ **JWT-based Security** - Industry-standard token format
✅ **Role Mapping** - Automatic LMS role → LTI role conversion
✅ **Custom Parameters** - Pass custom data to tools
✅ **Launch Tracking** - Audit trail of all launches

### OneRoster Features:
✅ **Organization Sync** - Schools, districts, institutions
✅ **Academic Session Sync** - Terms, semesters, periods
✅ **Class Sync** - Course sections and classes
✅ **User Sync** - Student and teacher data
✅ **Enrollment Sync** - User-class relationships
✅ **Grade Sync** - Assignment and grade data
✅ **OAuth 1.0 Authentication** - Secure API access
✅ **Filtering & Pagination** - Efficient data retrieval

## Security

- **Row-Level Security (RLS)** on all tables
- **JWT signature verification** for LTI launches
- **OAuth 1.0 signature verification** for OneRoster
- **Access token expiration** and validation
- **Role-based access control** for admin functions
- **Audit logging** of all launches and grade submissions

## Integration Examples

### Launch Zoom from a Course:

```javascript
// In your course page component
const launchZoom = async () => {
  const response = await fetch('/api/lti/launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tool_id: zoomToolId,
      course_id: currentCourseId,
      return_url: window.location.href
    })
  });
  
  // Auto-submits to Zoom
  document.body.innerHTML = await response.text();
};
```

### Receive Grade from Turnitin:

The grade passback happens automatically when Turnitin sends a grade. Your LMS will:
1. Validate the access token
2. Store the grade in `lti_grade_passback`
3. Update the assignment submission
4. Update the gradebook

### Sync Roster with SIS:

```bash
# SIS system calls your OneRoster endpoint
GET /api/oneroster/enrollments?filter=classSourcedId='class-001'
Authorization: OAuth oauth_consumer_key="...", oauth_signature="..."
```

## Next Steps

1. **Run Database Migration**: Execute `database/lti-oneroster-schema.sql` in Supabase
2. **Generate Platform Keys**: Create RSA key pair for LTI platform
3. **Configure Platform**: Insert platform config into `lti_platform_config` table
4. **Register Tools**: Add LTI tools via admin UI or API
5. **Test Launch**: Launch a test tool to verify setup
6. **Sync OneRoster Data**: Populate OneRoster tables with your data

## Documentation

- **Setup Guide**: See `md/LTI_ONEROSTER_SETUP.md` for detailed setup instructions
- **API Documentation**: All endpoints follow LTI 1.3 and OneRoster specifications
- **Admin Guide**: Use `/admin/lti-tools` to manage tools

## Compliance

This implementation follows:
- **LTI 1.3 Core Specification** (IMS Global)
- **LTI Advantage** (Grade Passback, Deep Linking)
- **OneRoster 1.1 Specification** (IMS Global)
- **OAuth 2.0** (RFC 6749)
- **OAuth 1.0** (RFC 5849)
- **JWT** (RFC 7519)

## Support

For issues or questions:
1. Check the setup guide: `md/LTI_ONEROSTER_SETUP.md`
2. Review server logs in Supabase dashboard
3. Verify tool configurations in admin UI
4. Test with LTI 1.3 Test Tool: https://lti-ri.imsglobal.org/

