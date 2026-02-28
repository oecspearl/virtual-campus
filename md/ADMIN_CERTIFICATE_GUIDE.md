# Admin Guide: Creating and Managing Certificates

## How Certificates Work

### Automatic Generation
Certificates are **automatically generated** when:
1. A student completes a course (enrollment status changes to `completed`)
2. The system detects completion via database trigger
3. Background job processes completions (runs every 6 hours)

### Manual Generation
Admins can manually generate certificates when needed.

## Admin Certificate Management

### 1. Manage Certificate Templates

**Path**: `/admin/certificates/templates`

**What you can do**:
- ✅ View all certificate templates
- ✅ Create new templates
- ✅ Edit existing templates
- ✅ Set default template
- ✅ Delete templates (except default)

**Creating a Template**:

1. Click **"Create Template"** button
2. Fill in:
   - **Template Name**: e.g., "Standard Certificate"
   - **Description**: Optional description
   - **Template HTML**: HTML with template variables
   - **Logo URL**: URL to your logo image
   - **Background Image URL**: Optional background
   - **Set as default**: Check to make this the default template

3. **Available Variables**:
   - `{{student_name}}` - Student's full name
   - `{{course_name}}` - Course title
   - `{{completion_date}}` - Date of completion (formatted)
   - `{{grade_percentage}}` - Final grade percentage (if available)
   - `{{verification_code}}` - Unique verification code
   - `{{logo_url}}` - Logo URL (from template settings)

4. Click **"Save Template"**

**Example Template HTML**:
```html
<div style="text-align: center; padding: 60px;">
  <h1>Certificate of Completion</h1>
  <p>This certifies that</p>
  <h2>{{student_name}}</h2>
  <p>has completed</p>
  <h3>{{course_name}}</h3>
  <p>Issued on {{completion_date}}</p>
  <p>Code: {{verification_code}}</p>
</div>
```

### 2. Manage Certificates

**Path**: `/admin/certificates/manage`

**What you can do**:
- ✅ View all issued certificates
- ✅ Search by student name, course, or verification code
- ✅ Download certificate PDFs
- ✅ Regenerate certificates (if PDF missing)
- ✅ View certificate details

**Manually Generate Certificate**:

If a certificate is missing or needs regeneration:

1. Find the certificate in the list (or it won't exist if not generated)
2. Click **"Generate"** button
3. System will create PDF and store in storage
4. Certificate will appear with download link

**Note**: To manually generate a certificate for a student who completed a course:

```javascript
// Use the API directly
POST /api/certificates/generate
{
  "studentId": "uuid",
  "courseId": "uuid",
  "forceRegenerate": true  // Optional: regenerate if exists
}
```

### 3. Access via Admin Settings

**Path**: `/admin/settings`

The admin settings page now includes quick links to:
- **Certificate Templates** - Design and manage templates
- **Manage Certificates** - View and manage all certificates

## Certificate Generation Process

### Step-by-Step Flow:

1. **Student Completes Course**
   - Enrollment status → `completed`
   - Database trigger fires

2. **System Detects Completion**
   - Checks if certificate already exists
   - Verifies all lessons are completed

3. **Certificate Generated**
   - Fetches default template (or specified template)
   - Replaces variables with student/course data
   - Generates PDF using PDFKit
   - Uploads to Supabase Storage
   - Creates certificate record in database
   - Records CEU credits (if course has credits)

4. **Student Can Access**
   - View at `/profile/certificates`
   - Download PDF
   - Share verification link

## Template Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{student_name}}` | Student's full name | "John Doe" |
| `{{course_name}}` | Course title | "Introduction to Web Development" |
| `{{completion_date}}` | Formatted completion date | "January 15, 2024" |
| `{{grade_percentage}}` | Final grade percentage | "85" |
| `{{verification_code}}` | Unique verification code | "ABC12345" |
| `{{logo_url}}` | Logo URL from template | "https://example.com/logo.png" |

## Conditional Rendering

You can conditionally show content:

```html
{{#if grade_percentage}}
  <p>Grade: {{grade_percentage}}%</p>
{{/if}}
```

**Note**: Basic conditional support is implemented. For complex logic, modify the template generator.

## Best Practices

### Template Design:
- ✅ Keep HTML simple and print-friendly
- ✅ Use inline CSS (PDFKit limitations)
- ✅ Test template with sample data
- ✅ Include verification code for authenticity
- ✅ Add your organization logo

### Certificate Management:
- ✅ Set one default template
- ✅ Keep templates organized with clear names
- ✅ Test new templates before setting as default
- ✅ Monitor certificate generation for errors

### Troubleshooting:

**Certificate not generating?**
1. Check enrollment status is `completed`
2. Verify all lessons are marked complete
3. Check cron job is running
4. Manually trigger via admin panel

**PDF looks wrong?**
1. Check template HTML syntax
2. Verify all variables are correctly named
3. Test with sample data
4. Check browser console for errors

**Storage errors?**
1. Verify `certificates` bucket exists
2. Check bucket permissions
3. Verify file size limits
4. Check service role key is set

## Quick Links

- **Templates**: `/admin/certificates/templates`
- **Manage Certificates**: `/admin/certificates/manage`
- **Student View**: `/profile/certificates`
- **Public Verification**: `/verify/[code]`

## API Endpoints (for advanced use)

- `GET /api/admin/certificates/templates` - List templates
- `POST /api/admin/certificates/templates` - Create template
- `PUT /api/admin/certificates/templates/[id]` - Update template
- `DELETE /api/admin/certificates/templates/[id]` - Delete template
- `POST /api/certificates/generate` - Generate certificate
- `GET /api/admin/certificates` - List all certificates

