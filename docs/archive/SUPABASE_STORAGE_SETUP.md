# 🗂️ Supabase Storage Setup for Course Materials

## Overview
OECS LearnBoard uses Supabase Storage to handle file uploads for course materials including videos, documents, images, and other resources.

## 🚀 Setup Instructions

### 1. Create Storage Bucket
In your Supabase dashboard:

1. **Go to** Storage section
2. **Click** "Create a new bucket"
3. **Name**: `course-materials`
4. **Public**: ✅ Yes (for direct file access)
5. **File size limit**: 50MB
6. **Allowed MIME types**: 
   - `video/*` (for videos)
   - `audio/*` (for audio files - MP3, WAV, OGG, M4A)
   - `application/pdf` (for PDFs)
   - `image/*` (for images)
   - `application/msword` (for Word docs)
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (for DOCX)
   - `application/vnd.ms-powerpoint` (for PPT)
   - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (for PPTX)
   - `text/*` (for text files)

### 2. Set Up Storage Policies

**Important**: You cannot directly modify the `storage.objects` table. Instead, use the Supabase Dashboard:

#### Option A: Use Supabase Dashboard (Recommended)

1. **Go to** Storage → Policies in your Supabase dashboard
2. **Click** "New Policy" for the `course-materials` bucket
3. **Create these policies**:

**Policy 1: Allow authenticated users to upload**
- **Policy name**: `Authenticated users can upload files`
- **Policy type**: `INSERT`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

**Policy 2: Allow authenticated users to view files**
- **Policy name**: `Authenticated users can view files`
- **Policy type**: `SELECT`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.role() = 'authenticated'
```

**Policy 3: Allow users to update their own files**
- **Policy name**: `Users can update their own files`
- **Policy type**: `UPDATE`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 4: Allow users to delete their own files**
- **Policy name**: `Users can delete their own files`
- **Policy type**: `DELETE`
- **Policy definition**:
```sql
bucket_id = 'course-materials' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Option B: Public Access (Development Only)

For development/testing, you can make the bucket public:

1. **Go to** Storage → Settings
2. **Find** your `course-materials` bucket
3. **Toggle** "Public bucket" to ON

**⚠️ Warning**: This allows anyone to upload and access files - use only for development!

## 📁 File Structure

Files are stored with this naming pattern:
```
course-materials/
├── 1703123456789-abc123def456.pdf
├── 1703123456790-xyz789uvw012.mp4
└── 1703123456791-mno345pqr678.jpg
```

Format: `{timestamp}-{randomString}.{extension}`

## 🔧 Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing File Upload

### 1. Test Upload API
```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer your_token" \
  -F "file=@test-file.pdf"
```

### 2. Test in Browser
1. **Go to** `/lessons/[id]/edit`
2. **Click** "Add File" content block
3. **Upload** a test file
4. **Verify** file appears in lesson content

## 📊 File Management

### Supported File Types
- **Videos**: MP4, WebM, MOV, AVI
- **Documents**: PDF, DOC, DOCX, PPT, PPTX, TXT
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Audio**: MP3, WAV, OGG

### File Size Limits
- **Maximum**: 50MB per file
- **Recommended**: 
  - Videos: < 20MB (compress if larger)
  - Documents: < 10MB
  - Images: < 5MB

### Storage Quotas
- **Free tier**: 1GB storage
- **Pro tier**: 100GB storage
- **Monitor usage** in Supabase dashboard

## 🔒 Security Considerations

### Production Setup
1. **Use proper RLS policies** (not the development ones)
2. **Implement file type validation** on frontend
3. **Scan uploaded files** for malware (consider third-party service)
4. **Set up CDN** for better performance
5. **Monitor storage usage** and costs

### File Validation
The upload API validates:
- ✅ File size (50MB limit)
- ✅ Authentication required
- ✅ Unique filename generation
- ✅ Database metadata storage

## 🚨 Troubleshooting

### Common Issues

1. **"Bucket not found"**
   - Verify bucket name is `course-materials`
   - Check bucket exists in Supabase dashboard

2. **"Permission denied"**
   - Check storage policies are set correctly in Supabase dashboard
   - Verify user is authenticated
   - Try making bucket public for testing

3. **"File too large"**
   - Reduce file size or increase limit
   - Consider file compression

4. **"Upload failed"**
   - Check network connection
   - Verify Supabase credentials
   - Check browser console for errors

5. **"ERROR: 42501: must be owner of table objects"**
   - **Cause**: Trying to modify `storage.objects` table directly
   - **Solution**: Use Supabase Dashboard → Storage → Policies instead of SQL editor
   - **Alternative**: Make bucket public for development/testing

### Debug Steps
1. **Check** Supabase dashboard logs
2. **Verify** environment variables
3. **Test** with smaller files first
4. **Check** browser network tab for API calls

## 📈 Performance Optimization

### File Optimization
1. **Compress videos** before upload
2. **Optimize images** (WebP format)
3. **Use appropriate** file formats
4. **Consider** lazy loading for large files

### CDN Setup
1. **Enable** Supabase CDN
2. **Configure** custom domain
3. **Set** appropriate cache headers

---

**Need Help?** Check the Supabase Storage documentation or contact support.
