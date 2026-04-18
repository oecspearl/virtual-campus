# Profile Picture Upload Implementation Guide

## Overview
This document describes the implementation of profile picture upload functionality for the LMS Enterprise application. Users can now upload and update their profile pictures directly through the profile page.

## Current Profile Features Review

### Existing Features
1. **Basic Information**
   - Name (editable)
   - Email (read-only)
   - Role (read-only)

2. **Profile Data**
   - Biography (editable textarea)
   - Avatar URL (editable text input) - **NOW ENHANCED WITH FILE UPLOAD**

3. **Learning Preferences**
   - Learning style (dropdown)
   - Difficulty preference (dropdown)
   - Subject interests (text input)

4. **Additional Features**
   - AI Tutor Preferences
   - Password Change functionality

### Database Structure
- **Table**: `user_profiles`
- **Avatar Field**: `avatar VARCHAR(500)` - stores URL to profile picture
- **Location**: Supabase Storage bucket `course-materials` with folder structure `profile-pictures/{user_id}/`

## Implementation Details

### 1. New API Endpoint: `/api/auth/profile/upload-avatar`

**Location**: `app/api/auth/profile/upload-avatar/route.ts`

**Features**:
- ✅ Authentication required (JWT token validation)
- ✅ Rate limiting (10 requests per minute per IP)
- ✅ File type validation (JPEG, PNG, GIF, WebP only)
- ✅ File size validation (5MB maximum)
- ✅ Automatic profile update after upload
- ✅ Unique filename generation with user ID organization
- ✅ Error handling and cleanup

**Request Format**:
```typescript
POST /api/auth/profile/upload-avatar
Headers: {
  Authorization: "Bearer <jwt_token>"
}
Body: FormData {
  file: File
}
```

**Response Format**:
```typescript
{
  success: true,
  avatar: "https://...", // Public URL of uploaded image
  message: "Profile picture uploaded successfully"
}
```

### 2. Enhanced UserProfile Component

**Location**: `app/components/UserProfile.tsx`

**New Features**:
- ✅ File upload button in avatar section (camera icon)
- ✅ File upload button next to Avatar URL input
- ✅ Image preview before upload
- ✅ Upload progress indicator
- ✅ Error and success messages
- ✅ Automatic profile refresh after upload

**User Experience**:
1. User clicks camera button or "Upload" button
2. File picker opens (accepts images only)
3. Image preview appears immediately
4. File uploads automatically
5. Success message displays
6. Profile refreshes with new avatar

### 3. File Storage

**Storage Location**: Supabase Storage
- **Bucket**: `course-materials` (existing bucket)
- **Folder Structure**: `profile-pictures/{user_id}/{timestamp}-{randomString}.{ext}`
- **Public Access**: Yes (for direct image display)

**File Organization**:
```
course-materials/
└── profile-pictures/
    ├── {user-id-1}/
    │   ├── 1703123456789-abc123.jpg
    │   └── 1703123456790-xyz789.png
    └── {user-id-2}/
        └── 1703123456791-mno345.webp
```

## Validation Rules

### File Type
- ✅ Allowed: JPEG, JPG, PNG, GIF, WebP
- ❌ Rejected: All other file types

### File Size
- ✅ Maximum: 5MB
- ❌ Rejected: Files larger than 5MB

### Security
- ✅ Authentication required
- ✅ Rate limiting applied
- ✅ User can only upload their own profile picture
- ✅ File type validation on both client and server

## Usage Instructions

### For Users

1. **Navigate to Profile Page**
   - Go to `/profile`
   - Or click on your profile in the navigation

2. **Upload Profile Picture**
   - **Option 1**: Click the camera icon button on your current avatar
   - **Option 2**: Click the "Upload" button next to the Avatar URL field
   - Select an image file (JPEG, PNG, GIF, or WebP)
   - Wait for upload to complete
   - Your profile picture will update automatically

3. **Alternative: Use URL**
   - Enter an image URL in the "Avatar URL" field
   - Click "Save Changes" to update

### For Developers

#### Testing the Upload Endpoint

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/profile/upload-avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

#### Manual Testing Steps

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Navigate to profile page**
   - Login as a user
   - Go to `/profile`

3. **Test upload**
   - Click camera button
   - Select a test image
   - Verify upload succeeds
   - Check that avatar updates

4. **Test validation**
   - Try uploading a non-image file (should fail)
   - Try uploading a file > 5MB (should fail)
   - Verify error messages display correctly

## Storage Setup

### Supabase Storage Bucket

The implementation uses the existing `course-materials` bucket. No additional setup is required if this bucket already exists.

**If you need to create the bucket**:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `course-materials`
3. Set as **Public**: Yes
4. File size limit: 50MB (profile pictures are limited to 5MB by code)

### Storage Policies

The existing storage policies for `course-materials` should allow:
- Authenticated users to upload files
- Authenticated users to view files

If you encounter permission errors, ensure these policies exist:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
```

## Error Handling

### Client-Side Errors
- Invalid file type → Error message displayed
- File too large → Error message displayed
- Upload failure → Error message with details

### Server-Side Errors
- Authentication failure → 401 Unauthorized
- Rate limit exceeded → 429 Too Many Requests
- Invalid file type → 400 Bad Request
- File too large → 413 Payload Too Large
- Storage error → 500 Internal Server Error

## Future Enhancements

Potential improvements for future versions:

1. **Image Cropping/Editing**
   - Add image cropping tool before upload
   - Resize images automatically to optimal dimensions
   - Add filters or basic editing

2. **Dedicated Storage Bucket**
   - Create separate `profile-pictures` bucket
   - Better organization and management
   - Separate storage policies

3. **Image Optimization**
   - Automatic compression
   - Multiple size variants (thumbnail, medium, large)
   - WebP conversion for better performance

4. **Old Image Cleanup**
   - Delete old profile pictures when new one is uploaded
   - Prevent storage bloat

5. **Avatar Defaults**
   - Generate default avatars with initials
   - Gravatar integration option

## Troubleshooting

### Upload Fails with 500 Error
- Check Supabase Storage bucket exists
- Verify storage policies are configured
- Check file size limits

### Image Doesn't Display
- Verify the URL is accessible
- Check CORS settings on Supabase Storage
- Ensure bucket is set to public

### Rate Limit Errors
- Wait 1 minute between upload attempts
- Check if multiple users are uploading from same IP

## Files Modified/Created

### New Files
- `app/api/auth/profile/upload-avatar/route.ts` - Upload endpoint

### Modified Files
- `app/components/UserProfile.tsx` - Added upload functionality

## Dependencies

No new dependencies required. Uses existing:
- Next.js API routes
- Supabase Storage client
- React hooks (useState, useRef, useEffect)
- Framer Motion (for animations)

## Security Considerations

1. **Authentication**: All uploads require valid JWT token
2. **Rate Limiting**: Prevents abuse (10 uploads/minute)
3. **File Validation**: Type and size validation on both client and server
4. **User Isolation**: Files organized by user ID
5. **Error Messages**: Generic error messages to prevent information leakage

## Performance

- **Upload Size**: 5MB maximum (reasonable for profile pictures)
- **Storage**: Files stored in Supabase Storage (scalable)
- **Caching**: Public URLs cached by browser/CDN
- **Rate Limiting**: Prevents server overload
