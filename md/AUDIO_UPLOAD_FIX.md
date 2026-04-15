# 🎵 Audio Upload 500 Error Fix

## 🚨 Problem

You're getting a 500 error when uploading audio files because the Supabase Storage bucket `course-materials` doesn't have audio MIME types in its allowed list.

## ✅ Solution: Update Supabase Storage Bucket Configuration

**No database changes needed!** The database schema already supports audio files. You just need to update the Storage bucket configuration.

### Step 1: Update Bucket Allowed MIME Types

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Storage** section

2. **Edit the `course-materials` Bucket**
   - Click on the `course-materials` bucket
   - Click **Settings** or **Edit** button

3. **Add Audio MIME Types**
   - Find the **"Allowed MIME types"** field
   - Add: `audio/*`
   - This will allow all audio formats: MP3, WAV, OGG, M4A, etc.

4. **Save Changes**
   - Click **Save** or **Update**

### Step 2: Alternative - Specific Audio MIME Types

If you prefer to be more specific (instead of `audio/*`), you can add these individual MIME types:

- `audio/mpeg` (MP3)
- `audio/wav` (WAV)
- `audio/ogg` (OGG)
- `audio/mp4` (M4A)
- `audio/x-m4a` (M4A alternative)

### Step 3: Verify Storage Policies

Make sure your storage policies allow authenticated users to upload files. If you haven't set these up yet, follow the guide in `MEDIA_UPLOAD_FIX_GUIDE.md`.

The policies should allow:
- ✅ INSERT for authenticated users
- ✅ SELECT for authenticated users
- ✅ UPDATE for file owners
- ✅ DELETE for file owners

### Step 4: Test Audio Upload

1. Go to a lesson edit page
2. Add an "Audio/Podcast" content block
3. Upload an audio file (MP3, WAV, OGG, or M4A)
4. It should now upload successfully!

## 📋 Database Schema (No Changes Needed)

The `files` table already supports any file type. The `type` column stores the MIME type as a string, so it will automatically handle audio files once the Storage bucket allows them.

```sql
-- Current schema (already supports audio)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),  -- Stores MIME type (e.g., "audio/mpeg")
    size BIGINT,
    url TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔍 Troubleshooting

### Still Getting 500 Error?

1. **Check Supabase Dashboard Logs**
   - Go to **Logs** → **Storage**
   - Look for error messages related to file uploads

2. **Verify Bucket Configuration**
   - Make sure `audio/*` is in the allowed MIME types list
   - Check that the bucket is public or policies allow authenticated uploads

3. **Check File Size**
   - Audio files must be ≤ 50MB (current limit)
   - Try a smaller file to test

4. **Verify Storage Policies**
   - Ensure INSERT policy allows authenticated users
   - Check that the bucket exists and is accessible

### Common Error Messages

- **"File type not allowed"** → Add `audio/*` to allowed MIME types
- **"Bucket not found"** → Verify bucket name is `course-materials`
- **"Permission denied"** → Check storage policies
- **"File too large"** → Reduce file size (max 50MB)

## 🎉 Success!

Once you've added `audio/*` to the allowed MIME types, audio uploads should work perfectly. The AudioPlayer component will automatically handle the uploaded files.

## 📝 Quick Reference

**What to do:**
1. Supabase Dashboard → Storage
2. Edit `course-materials` bucket
3. Add `audio/*` to allowed MIME types
4. Save

**What NOT to do:**
- ❌ Don't modify the database schema (it's already correct)
- ❌ Don't change the API code (it's already correct)
- ✅ Just update the Storage bucket configuration

---

**Need more help?** Check the full guide in `MEDIA_UPLOAD_FIX_GUIDE.md` or `SUPABASE_STORAGE_SETUP.md`

