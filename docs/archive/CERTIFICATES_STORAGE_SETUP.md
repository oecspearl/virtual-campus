# Certificates Storage Bucket Setup Guide

## Step 1: Create the Bucket

In Supabase Dashboard:
1. Go to **Storage** → **Buckets**
2. Click **New Bucket**
3. Name: `certificates`
4. **Public bucket**: ✅ **Enable** (check this box)
5. **File size limit**: `10 MB` (or higher if needed)
6. Click **Create bucket**

## Step 2: Configure Bucket Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies. Run this SQL in the Supabase SQL Editor:

```sql
-- Storage policies for certificates bucket
-- These allow:
-- 1. Service role to upload/download any file (for API)
-- 2. Authenticated users to download their own certificates
-- 3. Public to download files (for verification)

-- Policy: Allow service role full access
CREATE POLICY "Service role can manage all certificates"
ON storage.objects FOR ALL
USING (bucket_id = 'certificates' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'service_role');

-- Policy: Allow authenticated users to view their own certificates
-- Files are stored as: {student_id}/{course_id}/{certificate_id}.pdf
CREATE POLICY "Users can view own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates' 
  AND (
    -- Match pattern: {user_id}/...
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'
  )
);

-- Policy: Allow public read access for verification
-- This enables the public verification page to display PDFs
CREATE POLICY "Public can view certificates for verification"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');
```

## Step 3: Verify Setup

Test the bucket by uploading a test file:

1. Go to **Storage** → **Buckets** → **certificates**
2. Try uploading a file manually
3. Check if the file URL is accessible

## Option A: Public Bucket (Recommended for Certificates)

**Best for**: Public verification, easy sharing

- ✅ **Public bucket**: Enabled
- ✅ **Anyone can read files** via direct URL
- ✅ **No authentication needed** for verification pages
- ⚠️ **Note**: Files are accessible if someone knows the exact path

**When to use**: When you want certificates to be easily shareable and verifiable without authentication.

## Option B: Private Bucket with Public Policies (More Secure)

**Best for**: More control, still allows verification

- ❌ **Public bucket**: Disabled
- ✅ **Public read policy**: Enabled (as shown above)
- ✅ **Files accessible** via verification page
- ✅ **More control** over who can access files

**When to use**: When you want more granular control over access.

## Recommended Configuration

For this LMS certificate system, I recommend **Option A (Public Bucket)** because:

1. Certificates are meant to be verifiable and shareable
2. The verification code provides sufficient security
3. Simpler setup and faster access
4. Students can easily share certificate URLs

### Recommended Settings:
- ✅ Public bucket: **Enabled**
- ✅ File size limit: **10 MB**
- ✅ Allowed MIME types: `application/pdf` (optional restriction)
- ✅ Policies: Use the SQL above

## Alternative: Signed URLs (Most Secure)

If you want maximum security, you can generate signed URLs instead of public URLs:

```typescript
// In lib/certificates/generator.ts - modify uploadCertificatePDF function
const { data, error } = await supabase.storage
  .from(bucket)
  .upload(fileName, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true
  });

// Generate signed URL (expires in 1 year)
const { data: signedUrl } = await supabase.storage
  .from(bucket)
  .createSignedUrl(fileName, 31536000); // 1 year in seconds

return signedUrl.signedUrl;
```

**Use this approach if**:
- You want certificates to expire
- You need to track certificate access
- You want more control over who can download

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket name is exactly `certificates`
- Check that the bucket exists in Storage dashboard

### "Access denied" error
- Verify RLS policies are created
- Check that service role key is set in environment variables
- For public access, ensure bucket is marked as public

### Files not accessible via URL
- Check bucket is set to public
- Verify file paths are correct (studentId/courseId/certificateId.pdf)
- Check file permissions in Storage dashboard

## File Path Structure

Files are stored with this structure:
```
certificates/
  ├── {student_id}/
  │   ├── {course_id}/
  │   │   └── {certificate_id}.pdf
  │   └── transcript-{timestamp}.pdf
```

Example:
```
certificates/
  ├── 123e4567-e89b-12d3-a456-426614174000/
  │   ├── 789e0123-e45f-67g8-h901-234567890abc/
  │   │   └── cert-abc123.pdf
```

This structure makes it easy to:
- Organize by student
- Find all certificates for a course
- Manage storage efficiently

