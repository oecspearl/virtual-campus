# SCORM Integration Implementation Guide

## Overview
This document describes the SCORM (Sharable Content Object Reference Model) integration implemented in the OECS Learning Hub LMS. SCORM allows instructors to upload standardized e-learning content packages that track student progress, scores, and interactions.

## Features Implemented

### 1. Database Schema
- **`scorm_packages`** table: Stores SCORM package metadata
- **`scorm_tracking`** table: Tracks student progress, scores, and interactions
- **`lessons.content_type`** column: Added to support different content types including SCORM

### 2. API Endpoints

#### `/api/scorm/upload` (POST)
- Uploads and extracts SCORM packages (ZIP files)
- Parses manifest XML (imsmanifest.xml)
- Extracts all files to Supabase Storage
- Supports SCORM 1.2 and SCORM 2004
- Maximum package size: 200MB

**Request:**
```
FormData:
- file: ZIP file
- lessonId: UUID
- courseId: UUID (optional)
```

**Response:**
```json
{
  "success": true,
  "scormPackage": {
    "id": "uuid",
    "title": "Package Title",
    "scorm_version": "1.2" | "2004",
    "package_url": "public URL",
    "launch_file": "index.html",
    "package_size": 12345678,
    "files_extracted": 45
  }
}
```

#### `/api/scorm/runtime` (POST)
- SCORM Runtime API implementation
- Handles Initialize, GetValue, SetValue, Commit, Terminate
- Maps SCORM data model elements to database fields
- Supports both SCORM 1.2 and 2004

**Request:**
```json
{
  "action": "Initialize" | "GetValue" | "SetValue" | "Commit" | "Terminate",
  "scormPackageId": "uuid",
  "element": "cmi.core.lesson_status" (for GetValue/SetValue),
  "value": "completed" (for SetValue),
  "courseId": "uuid",
  "lessonId": "uuid"
}
```

**Response:**
```json
{
  "result": "true" | "value",
  "scorm_error_code": "0"
}
```

#### `/api/scorm/package/[lessonId]` (GET)
- Fetches SCORM package for a lesson
- Returns package metadata and public URL

### 3. React Components

#### `SCORMPlayer` Component
Located at: `app/components/SCORMPlayer.tsx`

**Props:**
- `packageUrl`: Public URL to the SCORM launch file
- `scormPackageId`: UUID of the SCORM package
- `scormVersion`: "1.2" | "2004"
- `courseId`: Optional course ID
- `lessonId`: Optional lesson ID
- `title`: Display title

**Features:**
- Loads SCORM content in sandboxed iframe
- Exposes SCORM API (API and API_1484_11) to content
- Auto-saves progress every 30 seconds
- Handles session termination on unmount
- Mobile-responsive design

### 4. UI Integration

#### Lesson Editor
- Content type selector (Rich Text, SCORM, Video, Quiz, Assignment)
- SCORM package upload interface
- Package metadata display
- Remove package functionality

#### Lesson Viewer
- Detects `content_type === 'scorm'`
- Renders `SCORMPlayer` component for SCORM lessons
- Falls back to `LessonViewer` for other content types

## Database Migration

Run the SQL migration file:
```bash
database/create-scorm-schema.sql
```

This will:
1. Add `content_type` column to `lessons` table
2. Create `scorm_packages` table
3. Create `scorm_tracking` table
4. Set up RLS policies
5. Create triggers for auto-sync to `lesson_progress`

## Usage Instructions

### For Instructors

1. **Create/Edit a Lesson**
   - Navigate to `/lessons/[id]/edit`
   - Select "SCORM Package" from Content Type dropdown

2. **Upload SCORM Package**
   - Click "Choose File" in the SCORM upload section
   - Select a valid SCORM ZIP file (max 200MB)
   - Wait for upload and extraction to complete
   - Package metadata will display upon success

3. **View SCORM Content**
   - Navigate to the lesson as a student
   - SCORM content will load automatically
   - Progress is tracked and synced automatically

### For Students

1. **Access SCORM Lessons**
   - SCORM lessons work like any other lesson
   - Content loads in a dedicated player
   - Progress, scores, and completion are tracked automatically
   - Can resume from where they left off (if supported by package)

## Technical Details

### SCORM Data Model Mapping

**SCORM 1.2:**
- `cmi.core.lesson_status` → `completion_status`
- `cmi.core.score.raw` → `score_raw`
- `cmi.core.score.max` → `score_max`
- `cmi.core.total_time` → `total_time` / `time_spent`
- `cmi.core.lesson_location` → `location`
- `cmi.suspend_data` → `suspend_data`

**SCORM 2004:**
- `cmi.completion_status` → `completion_status`
- `cmi.success_status` → `success_status`
- `cmi.score.raw` → `score_raw`
- `cmi.score.scaled` → `score_scaled`
- `cmi.progress_measure` → `progress_measure`
- `cmi.session_time` → `session_time`
- `cmi.total_time` → `total_time`

### Progress Synchronization

The database trigger `sync_scorm_to_lesson_progress` automatically:
- Updates `lesson_progress` when SCORM completion changes
- Syncs time spent
- Marks lessons as completed when SCORM reports completion

### Security Considerations

1. **Sandboxed iframe**: SCORM content runs in sandboxed iframe
   - `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"`
   - Prevents XSS attacks

2. **RLS Policies**: 
   - Students can only view/update their own tracking data
   - Instructors can view all tracking data
   - Package upload restricted to instructors/admins

3. **Size Limits**: 200MB maximum package size

4. **File Validation**: 
   - Must be valid ZIP file
   - Must contain `imsmanifest.xml`
   - Files extracted to isolated storage paths

## Troubleshooting

### Common Issues

1. **"SCORM package must contain imsmanifest.xml"**
   - Ensure the ZIP file is a valid SCORM package
   - Check that `imsmanifest.xml` is in the root directory

2. **"Failed to parse SCORM manifest XML"**
   - Verify the manifest XML is valid
   - Check for encoding issues (should be UTF-8)

3. **Progress not syncing**
   - Check browser console for SCORM API errors
   - Verify database triggers are installed
   - Check RLS policies allow updates

4. **Content not loading**
   - Verify package was extracted correctly
   - Check Supabase Storage permissions
   - Verify public URL is accessible

### Testing SCORM Packages

Recommended test packages:
- SCORM 1.2 Sample: Available from SCORM Cloud
- SCORM 2004 Sample: Available from Rustici Software

## Future Enhancements

Potential improvements:
1. Support for xAPI (Experience API) / Tin Can API
2. Batch upload for multiple SCORM packages
3. SCORM package preview before publishing
4. Advanced analytics dashboard for SCORM content
5. SCORM package versioning
6. Export SCORM tracking data

## Dependencies

- `jszip`: For extracting ZIP files
- `xml2js`: For parsing manifest XML
- `@supabase/supabase-js`: For database and storage operations

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console and server logs
3. Verify database schema is up to date
4. Test with known-good SCORM packages

