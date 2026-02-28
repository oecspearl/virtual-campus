# Avatar Upload 500 Error - Troubleshooting Guide

## Error Description
```
Failed to load resource: the server responded with a status of 500
Avatar upload error: Error: File upload failed
```

## Fixed Issues

### 1. Authentication Method ✅
**Problem**: The `authenticateUser` function expected `NextRequest` but was receiving standard `Request`.

**Solution**: Changed to use `getCurrentUser()` which is simpler and works with standard `Request` objects, matching the pattern used in `/api/media/upload`.

### 2. Service Client Import ✅
**Problem**: Dynamic import of `createServiceSupabaseClient` could cause issues.

**Solution**: Changed to direct import at the top of the file.

### 3. Error Handling ✅
**Problem**: Generic error messages didn't provide enough detail for debugging.

**Solution**: 
- Added detailed error logging on server
- Return error details in response
- Display detailed error messages on client

## Remaining Potential Issues

### 1. Storage Bucket Doesn't Exist

**Check**: Verify the `course-materials` bucket exists in Supabase Storage.

**Solution**:
1. Go to Supabase Dashboard → Storage
2. Verify `course-materials` bucket exists
3. If it doesn't exist, create it:
   - Name: `course-materials`
   - Public: ✅ Yes
   - File size limit: 50MB

### 2. Storage Bucket Permissions

**Check**: Verify storage policies allow authenticated users to upload.

**Solution**: Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
```

### 3. Nested Folder Path Issue

**Check**: The path `profile-pictures/${user.id}/` might fail if Supabase requires folders to exist first.

**Solution**: Supabase Storage should automatically create nested folders, but if issues persist, try:
- Simplifying the path to just `profile-pictures/` without user ID subfolder
- Or ensure the user ID is valid and doesn't contain special characters

### 4. File Size/Type Validation

**Check**: Ensure the file being uploaded:
- Is an image (JPEG, PNG, GIF, WebP)
- Is less than 5MB
- Has a valid file extension

**Solution**: The code validates these on both client and server, but check browser console for client-side validation errors.

## Testing Steps

1. **Check Server Logs**
   - Look at your server console/terminal for detailed error messages
   - The updated code now logs: `Supabase upload error:` with details

2. **Test Storage Bucket Access**
   ```bash
   # In Supabase Dashboard → Storage → course-materials
   # Try uploading a test file manually
   ```

3. **Test API Endpoint Directly**
   ```bash
   curl -X POST http://localhost:3000/api/auth/profile/upload-avatar \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/path/to/test-image.jpg"
   ```

4. **Check Browser Network Tab**
   - Open browser DevTools → Network tab
   - Try uploading again
   - Check the request/response for the `/api/auth/profile/upload-avatar` endpoint
   - Look for error details in the response body

## Common Error Messages

### "File upload failed"
- **Cause**: Storage bucket issue or permissions
- **Fix**: Check bucket exists and has correct policies

### "Authentication required"
- **Cause**: User not logged in or session expired
- **Fix**: Re-login and try again

### "Invalid file type"
- **Cause**: File is not an image or wrong MIME type
- **Fix**: Use JPEG, PNG, GIF, or WebP image

### "File too large"
- **Cause**: File exceeds 5MB limit
- **Fix**: Compress or resize the image

### "Failed to update profile with new avatar"
- **Cause**: Database update failed (RLS policy or missing user_profiles record)
- **Fix**: Check user_profiles table and RLS policies

## Debugging Code

The updated endpoint now includes detailed error logging. Check your server console for:

```
Supabase upload error: [error details]
Profile update error: [error details]
Avatar upload error: [error details]
```

These logs will help identify the exact failure point.

## Quick Fixes

### Option 1: Simplify Storage Path
If nested folders are causing issues, change line 55 in `upload-avatar/route.ts`:

```typescript
// From:
const fileName = `profile-pictures/${user.id}/${timestamp}-${randomString}.${fileExtension}`;

// To:
const fileName = `profile-pictures/${timestamp}-${randomString}.${fileExtension}`;
```

### Option 2: Use Service Role for Upload
If RLS policies are blocking, use service role client for upload:

```typescript
// Replace line 25:
const supabase = await createServerSupabaseClient();

// With:
const supabase = createServiceSupabaseClient();
```

**Note**: This bypasses RLS, so ensure you've validated the user first.

## Verification Checklist

- [ ] `course-materials` bucket exists in Supabase Storage
- [ ] Bucket is set to Public
- [ ] Storage policies allow authenticated users to INSERT
- [ ] Storage policies allow authenticated users to SELECT
- [ ] User is authenticated (check session)
- [ ] File is valid image type (JPEG, PNG, GIF, WebP)
- [ ] File size is under 5MB
- [ ] Server logs show detailed error messages
- [ ] Browser console shows no client-side errors

## Still Having Issues?

If the problem persists after checking all above:

1. **Check Supabase Dashboard**:
   - Storage → course-materials → Check if files are being uploaded
   - Check Storage logs for errors

2. **Check Database**:
   - Verify `user_profiles` table exists
   - Check RLS policies on `user_profiles` table
   - Verify user has a record in `users` table

3. **Check Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` is set
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
   - `SUPABASE_SERVICE_ROLE_KEY` is set (for service client)

4. **Test with a simpler file**:
   - Try a small JPEG image (< 1MB)
   - Ensure it has a standard filename (no special characters)
