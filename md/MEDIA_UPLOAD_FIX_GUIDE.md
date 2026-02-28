# 🔧 Media Upload 500 Error Fix Guide

## 🚨 Problem Identified

The `/api/media/upload` endpoint is returning 500 errors due to two main issues:

1. **Missing Storage Bucket**: The `course-materials` bucket doesn't exist in Supabase Storage
2. **Row Level Security Policies**: Storage and database policies are preventing file uploads

## ✅ Solution Steps

### Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to your project dashboard
   - Go to **Storage** section

2. **Create New Bucket**
   - Click **"Create a new bucket"**
   - **Name**: `course-materials`
   - **Public**: ✅ **Yes** (for direct file access)
   - **File size limit**: `50MB`
   - **Allowed MIME types**: 
     - `video/*` (for videos)
     - `audio/*` (for audio files - MP3, WAV, OGG, M4A) ⚠️ **IMPORTANT: Add this for audio uploads!**
     - `application/pdf` (for PDFs)
     - `image/*` (for images)
     - `application/msword` (for Word docs)
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (for DOCX)
     - `application/vnd.ms-powerpoint` (for PPT)
     - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (for PPTX)
     - `text/*` (for text files)

### Step 2: Set Up Storage Policies

1. **Go to Storage → Policies**
2. **Create these policies for the `course-materials` bucket**:

#### Policy 1: Upload Files
- **Policy name**: `Authenticated users can upload files`
- **Policy type**: `INSERT`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

#### Policy 2: View Files
- **Policy name**: `Authenticated users can view files`
- **Policy type**: `SELECT`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

#### Policy 3: Update Files
- **Policy name**: `Users can update their own files`
- **Policy type**: `UPDATE`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

#### Policy 4: Delete Files
- **Policy name**: `Users can delete their own files`
- **Policy type**: `DELETE`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

### Step 3: Set Up Database Policies

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run this SQL** to create policies for the `files` table:

```sql
-- Policy for files table: Allow authenticated users to insert their own files
CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Policy for files table: Allow authenticated users to view all files
CREATE POLICY "Users can view all files" ON files
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for files table: Allow users to update their own files
CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Policy for files table: Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = uploaded_by);
```

### Step 4: Test the Fix

1. **Run the debug script**:
```bash
node debug-media-upload.js
```

2. **Expected output**:
```
✅ Auth connection successful
✅ course-materials bucket exists
✅ Files table exists and accessible
✅ File upload successful
```

3. **Test in browser**:
   - Go to any page with file upload functionality
   - Try uploading a file
   - Should work without 500 errors

## 🚨 Alternative Quick Fix (Development Only)

If you need to test immediately, you can make the storage bucket public:

1. **Go to Storage → Settings**
2. **Find** your `course-materials` bucket
3. **Toggle** "Public bucket" to **ON**

⚠️ **Warning**: This allows anyone to upload and access files - use only for development!

## 🔍 Verification

After completing the setup, the media upload should work properly:

- ✅ Files upload to Supabase Storage
- ✅ File metadata saved to database
- ✅ Public URLs generated correctly
- ✅ No more 500 errors

## 📋 Files Modified

- `fix-storage-setup.sql` - SQL commands for database policies
- `debug-media-upload.js` - Debug script to test the fix
- `MEDIA_UPLOAD_FIX_GUIDE.md` - This guide

## 🎯 Next Steps

1. Complete the storage bucket setup in Supabase Dashboard
2. Run the database policies SQL
3. Test with the debug script
4. Verify file upload works in the application

The media upload functionality should now work correctly! 🎉
