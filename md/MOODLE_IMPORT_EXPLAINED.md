# How Moodle Import Works

This document explains how the application parses Moodle backup files (.mbz/.zip) and XML course files (.xml) and converts them into courses in the LMS.

## Overview

The import process supports two Moodle formats:
1. **Full Backup (.mbz/.zip)**: Complete course backup with all files, content, and activities
2. **XML Course Export (.xml)**: Course structure only (sections and activities, no files)

## Import Flow

```
User Uploads File
    ↓
File Type Detection (.mbz/.zip vs .xml)
    ↓
┌─────────────────┬─────────────────┐
│   .mbz/.zip     │      .xml       │
│   (Full Backup) │  (Structure)    │
└─────────────────┴─────────────────┘
    ↓                    ↓
Extract ZIP         Parse XML
    ↓                    ↓
Parse XML Files     Create Course
    ↓                    ↓
Extract Files       Create Subjects
    ↓                    ↓
Create Course       Create Lessons
    ↓                    ↓
Create Subjects     (Placeholders)
    ↓
Create Lessons
    ↓
Upload Files
    ↓
Complete!
```

## Format 1: Full Backup (.mbz/.zip)

### Step 1: File Validation
- Check file extension (.mbz or .zip)
- Validate file size (max 500MB)
- Check ZIP file signature ("PK" header)
- Load ZIP archive using JSZip library

### Step 2: Extract and Parse Backup Structure

The `.mbz` file is a ZIP archive containing:

```
backup.mbz
├── moodle_backup.xml          # Backup metadata
├── course/
│   └── course.xml             # Course structure
├── activities/                 # Activity modules
│   ├── page_123/
│   │   └── page.xml
│   ├── quiz_456/
│   │   └── quiz.xml
│   └── assignment_789/
│       └── assignment.xml
└── files/                      # Course files
    └── (various files)
```

#### 2.1 Parse `moodle_backup.xml`
```xml
<moodle_backup>
  <info>
    <moodle_version>4.2</moodle_version>
    <backup_version>2022112800</backup_version>
    <backup_date>1234567890</backup_date>
    <include_files>1</include_files>
    <include_userdata>0</include_userdata>
  </info>
</moodle_backup>
```

**Extracted Information:**
- Moodle version
- Backup version and date
- Whether files are included
- Whether user data is included

#### 2.2 Parse `course/course.xml`
```xml
<course>
  <courseid>123</courseid>
  <title>Introduction to Mathematics</title>
  <shortname>MATH101</shortname>
  <categoryid>5</categoryid>
  <categoryname>Mathematics</categoryname>
  <summary>Course description...</summary>
  <format>topics</format>
  <sections>
    <section>
      <sectionid>1</sectionid>
      <number>1</number>
      <name>Week 1: Basics</name>
      <summary>Introduction to basic concepts</summary>
      <activities>
        <activity>
          <moduleid>10</moduleid>
          <modulename>page</modulename>
          <title>Introduction Page</title>
          <directory>page_10</directory>
        </activity>
        <activity>
          <moduleid>11</moduleid>
          <modulename>quiz</modulename>
          <title>Week 1 Quiz</title>
          <directory>quiz_11</directory>
        </activity>
      </activities>
    </section>
  </sections>
</course>
```

**Extracted Information:**
- Course metadata (title, description, category)
- Sections (weeks/topics)
- Activities within each section

### Step 3: Create Course in Database

```typescript
// Insert into courses table
{
  title: "Introduction to Mathematics",
  description: "Course description...",
  grade_level: "Mathematics",
  subject_area: "MATH101",
  published: false
}
```

### Step 4: Map Moodle Structure to LMS Structure

**Moodle → LMS Mapping:**
- **Moodle Course** → **LMS Course**
- **Moodle Section** → **LMS Subject**
- **Moodle Activity** → **LMS Lesson**

### Step 5: Process Each Section

For each Moodle section:
1. Create a **Subject** in the database
2. Process activities within the section

### Step 6: Process Each Activity

For each activity, the system:

#### 6.1 Reads Activity XML
Location: `activities/{modulename}_{moduleid}/{modulename}.xml`

#### 6.2 Handles Different Activity Types

**Page Activity:**
```xml
<page>
  <intro>Introduction text</intro>
  <content>Page content HTML</content>
</page>
```
→ Creates lesson with `content_type: 'rich_text'` and HTML content

**File/Resource Activity:**
```xml
<resource>
  <file>
    <reference>files/course/document.pdf</reference>
  </file>
</resource>
```
→ Extracts file from ZIP, uploads to Supabase Storage, creates lesson with file reference

**Quiz Activity:**
```xml
<quiz>
  <intro>Quiz instructions</intro>
  <question_instances>
    <question_instance>
      <questionid>123</questionid>
      <slot>1</slot>
    </question_instance>
  </question_instances>
  <timeopen>3600</timeopen>
  <attempts_number>3</attempts_number>
</quiz>
```
→ Creates lesson with `content_type: 'quiz'` and quiz data structure

**Assignment Activity:**
```xml
<assignment>
  <intro>Assignment description</intro>
  <duedate>1234567890</duedate>
  <allowsubmissionsfromdate>1234567890</allowsubmissionsfromdate>
</assignment>
```
→ Creates lesson with `content_type: 'assignment'` and assignment data

#### 6.3 Create Lesson Record

```typescript
// Insert into lessons table
{
  course_id: "uuid",
  subject_id: "uuid",
  title: "Activity Title",
  description: "Activity description",
  content: [
    {
      type: "text" | "file" | "quiz" | "assignment",
      title: "Content Title",
      data: { ... } // Content-specific data
    }
  ],
  content_type: "rich_text" | "quiz" | "assignment",
  order: 0,
  published: true
}
```

### Step 7: Handle Files

For file resources:
1. Extract file from ZIP: `files/{filepath}`
2. Read file buffer
3. Upload to Supabase Storage: `course-materials/{courseId}/{fileId}/{filename}`
4. Get public URL
5. Reference in lesson content

## Format 2: XML Course Export (.xml)

### Step 1: Parse XML File

The XML file contains course structure directly:

```xml
<course>
  <id>123</id>
  <fullname>Introduction to Mathematics</fullname>
  <shortname>MATH101</shortname>
  <sections>
    <section>
      <id>1</id>
      <number>1</number>
      <name>Week 1</name>
      <summary>Introduction</summary>
      <modules>
        <module>
          <id>10</id>
          <modulename>page</modulename>
          <name>Introduction Page</name>
        </module>
      </modules>
    </section>
  </sections>
</course>
```

### Step 2: Create Course Structure

Since XML format doesn't include file contents:
1. Create course
2. Create subjects (from sections)
3. Create lessons (from modules/activities) with **placeholder content**
4. Set `published: false` so user can review and add actual content

## Data Structure Mapping

### Moodle → LMS

| Moodle | LMS | Notes |
|--------|-----|-------|
| Course | Course | Direct mapping |
| Section | Subject | Sections become subjects |
| Activity | Lesson | Activities become lessons |
| Page | Lesson (rich_text) | HTML content preserved |
| File/Resource | Lesson (file) | File uploaded to storage |
| Quiz | Lesson (quiz) | Quiz structure imported |
| Assignment | Lesson (assignment) | Assignment data imported |
| Book | Lesson (rich_text) | Book content as HTML |
| Label | Lesson (rich_text) | Label as text content |

## Content Conversion

### HTML Content
- Moodle HTML is preserved as-is
- Embedded images/files are extracted and uploaded
- Links are preserved

### Files
- Extracted from ZIP archive
- Uploaded to Supabase Storage bucket: `course-materials`
- Path structure: `{courseId}/{fileId}/{filename}`
- Public URLs generated for access

### Quizzes
- Quiz structure imported
- Questions referenced (full question data may be in separate files)
- Time limits and attempt limits preserved

### Assignments
- Assignment descriptions imported
- Due dates preserved
- Submission settings preserved

## Error Handling

The import process handles errors gracefully:

1. **File-level errors**: If a file can't be extracted, log and continue
2. **Activity errors**: If an activity can't be imported, log error and continue with others
3. **Partial imports**: Course is created even if some activities fail
4. **Error reporting**: All errors collected and returned to user

## Limitations

### Full Backup (.mbz)
- ✅ Course structure
- ✅ Page content
- ✅ File resources
- ✅ Quiz structure
- ✅ Assignment structure
- ⚠️ Quiz questions (structure only, may need manual entry)
- ⚠️ User data (not imported)
- ⚠️ Grades (not imported)
- ⚠️ SCORM packages (may need manual handling)

### XML Export
- ✅ Course structure
- ✅ Section/activity names
- ❌ File contents (not included in XML)
- ❌ Activity content (structure only)
- ❌ Resources

## Post-Import

After import:
1. Course is created but **not published** (for review)
2. User is assigned as instructor
3. All lessons are created with content
4. User should:
   - Review imported content
   - Add missing content manually
   - Verify file uploads
   - Publish when ready

## Technical Details

### Libraries Used
- **JSZip**: For extracting ZIP/MBZ archives
- **xml2js**: For parsing XML files
- **Supabase Storage**: For file storage

### Database Tables Used
- `courses`: Course metadata
- `subjects`: Course sections/modules
- `lessons`: Individual activities/content
- `course_instructors`: Instructor assignments
- `files`: File metadata (if file tracking is used)

### Performance Considerations
- Large files are processed in memory (up to 500MB)
- Files are uploaded to storage asynchronously
- Import can take several minutes for large courses
- Progress is not currently tracked (future enhancement)

