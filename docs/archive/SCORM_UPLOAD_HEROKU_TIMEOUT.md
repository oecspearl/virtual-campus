# SCORM Upload Timeout Issue on Heroku

## Problem

Heroku web dynos have a **30-second timeout limit** for HTTP requests. SCORM package uploads can take 60-90+ seconds to:
1. Extract ZIP file
2. Upload 100+ files to Supabase Storage
3. Parse manifest XML
4. Save metadata to database

This results in:
- **499 errors** - Client (browser) timeout
- **503 errors** - Heroku timeout after 30 seconds
- Uploads fail even though they might complete on the server

## Current Status

✅ **Optimizations Applied:**
- Increased batch size from 10 to 50 files (parallel uploads)
- Added progress logging
- Added timeout warnings
- Enhanced error handling

⚠️ **Still Limited By:**
- Heroku's 30-second hard timeout for web requests
- Large SCORM packages (>50 files or >50MB) will likely timeout

## Solutions

### Option 1: Increase Heroku Timeout (Not Possible)
Heroku web dynos have a hard 30-second limit that cannot be changed.

### Option 2: Use Heroku Worker Dynos (Recommended)
Process uploads asynchronously using background workers:

1. **Return immediately** (202 Accepted) when upload starts
2. **Process in background** using Heroku Worker dyno
3. **Poll for status** or use webhooks to notify when complete

**Implementation:**
- Create a job queue (e.g., using Supabase or Redis)
- Add `/api/scorm/upload/status/[jobId]` endpoint
- Use Heroku Scheduler or worker process
- Update frontend to poll for completion

### Option 3: Switch to Different Platform
Consider platforms with longer timeouts:
- **Vercel Pro**: 300 seconds (5 minutes) - `maxDuration = 300` already set
- **AWS Lambda**: Up to 15 minutes (Pro tier)
- **Google Cloud Functions**: Up to 60 minutes

### Option 4: Optimize Further (Current Approach)
1. ✅ Increase batch size (already done: 50 files)
2. ⚠️ Skip non-essential files (images, assets not needed for launch)
3. ⚠️ Compress files before upload
4. ⚠️ Stream upload directly to Supabase (bypass server processing)

## Immediate Workaround

For small SCORM packages (<30 files, <20MB):
- Current optimizations should work
- Monitor logs for batch progress
- Try uploading during low-traffic times

For large SCORM packages:
- Split into smaller packages
- Or implement async job processing (Option 2)

## Testing

Check Heroku logs to see batch progress:
```bash
heroku logs --tail --app your-app-name
```

Look for:
- `[SCORM Upload] Extracting X files from package`
- `[SCORM Upload] Processing batch X/Y`
- `[SCORM Upload] Warning: X.Xs elapsed, approaching timeout`

## Next Steps

1. ✅ **Done**: Increased batch size and added logging
2. ⏳ **Todo**: Monitor if timeouts still occur
3. ⏳ **Todo**: If timeouts persist, implement async job queue (Option 2)
4. ⏳ **Todo**: Consider migrating to Vercel Pro for 300s timeout support

