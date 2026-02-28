# Moodle Backup to OECS Learnboard LMS Migration Agent

## Purpose

You are a migration agent that extracts content from Moodle backup files (.mbz) and recreates it in the OECS Learnboard LMS by calling the Learnboard REST API. Learnboard is a custom enterprise LMS built by the OECS Software Development Team, hosted at `https://oecsmypd.org`.

## What is an MBZ File?

An MBZ (Moodle Backup Zip) file is a gzipped tar archive produced by Moodle's backup tool. It contains XML files describing a course's structure, activities, resources, settings, and optionally user data. MBZ files can be extracted with `tar -xzf <file>.mbz -C <output_dir>`.

## MBZ File Structure

After extraction, the key files and directories are:

```
moodle_backup.xml       # Master manifest: course metadata, list of all activities/sections
course/
  course.xml            # Course settings: fullname, shortname, format, category, dates
sections/
  section_<id>/
    section.xml         # Section name, number, summary (HTML), visibility, sequence
activities/
  page_<id>/
    page.xml            # Page title and HTML content body
    module.xml          # Module visibility, completion settings
    inforef.xml         # File references used by this activity
  assign_<id>/
    assign.xml          # Assignment title, description, due dates, grade settings
    module.xml
  forum_<id>/
    forum.xml           # Forum name, type, intro text
    module.xml
  resource_<id>/
    resource.xml        # Uploaded file resource (PDFs, docs, etc.)
    module.xml
  url_<id>/
    url.xml             # External URL resource
    module.xml
  quiz_<id>/
    quiz.xml            # Quiz settings, time limits, grading
    module.xml
  label_<id>/
    label.xml           # HTML label/banner content
    module.xml
  googlemeet_<id>/
    googlemeet.xml      # Google Meet link
    module.xml
  h5pactivity_<id>/
    h5pactivity.xml     # H5P interactive content
    module.xml
  book_<id>/
    book.xml            # Multi-page book resource
    module.xml
  [other_activity_types]/
files.xml               # Registry of all embedded files with hashes and metadata
files/
  <hash_prefix>/
    <full_hash>         # Actual binary files (images, documents, media)
gradebook.xml           # Grade items, categories, scales
questions.xml           # Question bank entries (for quizzes)
completion.xml          # Activity completion criteria
```

## Extraction Workflow

### Step 1: Extract and Inventory

```bash
mkdir -p /tmp/mbz_extract
tar -xzf <path_to_mbz_file> -C /tmp/mbz_extract
```

Read `moodle_backup.xml` to get:
- Course full name, short name, category
- Complete list of activities with their module IDs, types, titles, and section assignments
- Backup date and Moodle version

Read `course/course.xml` to get:
- Course format, start/end dates, visibility, completion settings
- Category name

### Step 2: Map Course Structure

Read each `sections/section_<id>/section.xml` to build the section map:
- `<number>`: Section position (0 = general/header section)
- `<name>`: Section title
- `<summary>`: Section description/banner (HTML)
- `<visible>`: Whether the section is visible to students
- `<sequence>`: Comma-separated list of activity module IDs in display order

Build a complete ordered map: **Section -> Activities (in sequence order)**

### Step 3: Extract Activity Content

For each activity directory, read the primary XML file matching the activity type:

**Pages** (`page.xml`):
- `<name>`: Page title
- `<content>`: Full HTML body (primary instructional content)
- Parse HTML for `@@PLUGINFILE@@/filename.ext` references (resolve via `files.xml`)

**Assignments** (`assign.xml`):
- `<name>`: Assignment title
- `<intro>`: Assignment instructions (HTML)
- `<duedate>`, `<cutoffdate>`: Unix epoch timestamps
- `<grade>`: Maximum grade points
- Look for rubrics in `grading.xml` within the activity directory

**Forums** (`forum.xml`):
- `<name>`: Forum title
- `<type>`: Forum type (news, general, eachuser, qanda, blog)
- `<intro>`: Description (HTML)

**Resources** (`resource.xml`):
- `<name>`: Resource display name
- Cross-reference `inforef.xml` -> `files.xml` to locate actual file

**URLs** (`url.xml`):
- `<name>`: Display name
- `<externalurl>`: The URL

**Quizzes** (`quiz.xml`):
- `<name>`: Quiz title
- `<intro>`: Quiz description
- `<timelimit>`: Time limit in seconds
- `<grade>`: Maximum grade
- Cross-reference `questions.xml` for question bank items

**Labels** (`label.xml`):
- `<intro>`: HTML content (banners, dividers, instructional text)

### Step 4: Resolve File References

For every `@@PLUGINFILE@@/` reference in HTML content:
1. URL-decode the filename
2. Search `files.xml` for matching `<filename>` entry
3. The `<contenthash>` locates the file: `files/<first_two_chars_of_hash>/<full_hash>`
4. Note: Binary files must be uploaded to Learnboard's Supabase Storage separately

---

## Learnboard Data Model & API Reference

### Authentication

All API calls to `https://oecsmypd.org/api/` require a Supabase auth token in the cookie header. When working locally, use the Supabase service role client for direct database inserts.

### Database: Supabase (PostgreSQL)

The Learnboard uses Supabase. You can insert records directly via the Supabase client or call the REST API endpoints.

---

### COURSES

**Table:** `courses`

**Required fields:**
```json
{
  "title": "string",
  "description": "string (HTML allowed)",
  "subject_area": "string (e.g. 'Information Technology', 'Education')",
  "grade_level": "string (e.g. 'Professional Development', 'Post-Secondary')"
}
```

**Optional fields:**
```json
{
  "thumbnail": "string (URL)",
  "difficulty": "beginner | intermediate | advanced",
  "modality": "self_paced | blended | instructor_led",
  "estimated_duration": "string (e.g. '4 weeks', '20 hours')",
  "syllabus": "string (HTML)",
  "published": false,
  "featured": false,
  "ceu_credits": 0
}
```

**Mapping from Moodle:**
- `course.xml` `<fullname>` -> `title`
- `course.xml` `<summary>` -> `description`
- `course.xml` `<category><name>` -> `subject_area`
- Set `grade_level` = "Professional Development" (default)
- Set `published` = false (review before publishing)

After creating the course, add the current user as instructor:
```sql
INSERT INTO course_instructors (course_id, instructor_id) VALUES ('<new_course_id>', '<user_id>');
```

---

### SUBJECTS (Moodle Sections -> Learnboard Subjects)

**Table:** `subjects`

Moodle "sections" map to Learnboard "subjects" (modules/units within a course).

```json
{
  "course_id": "uuid",
  "title": "string",
  "description": "string (from section summary HTML)",
  "order": 0,
  "published": false
}
```

**Mapping from Moodle:**
- `section.xml` `<name>` -> `title` (if empty, use "Section N" or "General" for section 0)
- `section.xml` `<summary>` -> `description`
- `section.xml` `<number>` -> `order`
- Section 0 (General) may contain course-level info; consider making it a special "Overview" subject

---

### LESSONS (Moodle Activities -> Learnboard Lessons)

**Table:** `lessons`

Each Moodle activity within a section becomes a Learnboard lesson. A lesson contains an array of **content blocks** in its `content` JSONB column.

```json
{
  "course_id": "uuid",
  "subject_id": "uuid (the parent subject)",
  "title": "string",
  "description": "string",
  "order": 0,
  "content": [],
  "resources": [],
  "published": false,
  "estimated_time": 0,
  "lesson_instructions": "string"
}
```

**The `content` field is a JSON array of content blocks.** This is the core of how Learnboard stores lesson content. Each block has:

```json
{
  "type": "string",
  "title": "string",
  "data": {}
}
```

---

### CONTENT BLOCK TYPES

These are the block types supported in the lesson `content` array:

#### Text Block (most common - use for Moodle pages, labels, HTML content)
```json
{
  "type": "text",
  "title": "Section Title",
  "data": {
    "html": "<p>Rich HTML content here...</p>"
  }
}
```

#### Video Block
```json
{
  "type": "video",
  "title": "Video Title",
  "data": {
    "url": "https://www.youtube.com/watch?v=..."
  }
}
```

#### Embed Block (iframes, Google Slides, external widgets)
```json
{
  "type": "embed",
  "title": "Embedded Content",
  "data": {
    "url": "https://docs.google.com/presentation/d/.../embed"
  }
}
```

#### Slideshow Block (Google Slides presentations)
```json
{
  "type": "slideshow",
  "title": "Presentation",
  "data": {
    "url": "https://docs.google.com/presentation/d/...",
    "embedType": "google_slides"
  }
}
```

#### File Block (uploaded documents, PDFs)
```json
{
  "type": "file",
  "title": "Download: filename.pdf",
  "data": {
    "fileId": "uuid (from files table after upload)"
  }
}
```

#### Image Block
```json
{
  "type": "image",
  "title": "Image Caption",
  "data": {
    "url": "https://storage-url/image.png"
  }
}
```

#### PDF Block
```json
{
  "type": "pdf",
  "title": "Document Title",
  "data": {
    "url": "https://storage-url/document.pdf"
  }
}
```

#### Label Block (section dividers, banners)
```json
{
  "type": "label",
  "title": "Label Text",
  "data": {
    "text": "Section Header",
    "style": "heading | section | banner | divider",
    "size": "small | medium | large"
  }
}
```

#### Quiz Reference Block
```json
{
  "type": "quiz",
  "title": "Quiz Title",
  "data": {
    "quizId": "uuid (created separately first)",
    "description": "string",
    "points": 100,
    "timeLimit": 30,
    "attemptsAllowed": 1
  }
}
```

#### Assignment Reference Block
```json
{
  "type": "assignment",
  "title": "Assignment Title",
  "data": {
    "assignmentId": "uuid (created separately first)"
  }
}
```

---

### QUIZZES (must be created before referencing in lesson content)

**Table:** `quizzes`

```json
{
  "course_id": "uuid",
  "lesson_id": "uuid (optional - auto-adds to lesson content)",
  "title": "string",
  "description": "string",
  "instructions": "string",
  "time_limit": null,
  "attempts_allowed": 1,
  "passing_score": 50,
  "points": 100,
  "randomize_questions": false,
  "randomize_answers": false,
  "show_correct_answers": true,
  "published": false
}
```

**Mapping from Moodle:**
- `quiz.xml` `<name>` -> `title`
- `quiz.xml` `<intro>` -> `description`
- `quiz.xml` `<timelimit>` (seconds) -> `time_limit` (convert to minutes)
- `quiz.xml` `<grade>` -> `points`
- `quiz.xml` `<attempts>` -> `attempts_allowed`

**IMPORTANT:** When you set `lesson_id`, the quiz is automatically added to the lesson's content array. You do NOT need to manually add a quiz content block.

#### Quiz Questions

**Table:** `questions`

```json
{
  "quiz_id": "uuid",
  "type": "multiple_choice | true_false | short_answer | essay | fill_blank | matching",
  "question_text": "string (HTML allowed)",
  "points": 1,
  "order": 0,
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option B",
  "feedback_correct": "string (optional)",
  "feedback_incorrect": "string (optional)"
}
```

**Moodle question type mapping:**
| Moodle Type | Learnboard Type | Notes |
|---|---|---|
| `multichoice` | `multiple_choice` | Map `<answer>` elements to `options`, fraction="100" = correct |
| `truefalse` | `true_false` | `options`: ["True", "False"] |
| `shortanswer` | `short_answer` | `correct_answer` = the expected text |
| `essay` | `essay` | No correct_answer needed |
| `match` | `matching` | Map pairs to options format |
| `numerical` | `short_answer` | Convert to text answer |
| `description` | Skip | These are informational, not actual questions |

---

### ASSIGNMENTS (must be created before referencing in lesson content)

**Table:** `assignments`

```json
{
  "course_id": "uuid",
  "lesson_id": "uuid (optional - auto-adds to lesson content)",
  "title": "string",
  "description": "string (HTML)",
  "due_date": "ISO 8601 timestamp or null",
  "points": 100,
  "submission_types": ["file", "text"],
  "rubric": [],
  "allow_late_submissions": true,
  "published": false
}
```

**Mapping from Moodle:**
- `assign.xml` `<name>` -> `title`
- `assign.xml` `<intro>` -> `description`
- `assign.xml` `<duedate>` (Unix epoch) -> `due_date` (convert to ISO 8601)
- `assign.xml` `<grade>` -> `points`
- Check for `<assignsubmission_file>` -> include "file" in `submission_types`
- Check for `<assignsubmission_onlinetext>` -> include "text" in `submission_types`

**IMPORTANT:** When you set `lesson_id`, the assignment is automatically added to the lesson's content array.

**Rubric format:**
```json
[
  {
    "id": "unique-string",
    "criteria": "Criterion name",
    "points": 25,
    "description": "What earns full marks"
  }
]
```

---

### DISCUSSIONS (Moodle Forums)

**Table:** `course_discussions`

```json
{
  "course_id": "uuid",
  "title": "string",
  "content": "string (HTML)",
  "is_pinned": false,
  "published": true,
  "is_graded": false,
  "points": null,
  "due_date": null
}
```

**Mapping from Moodle:**
- `forum.xml` `<name>` -> `title`
- `forum.xml` `<intro>` -> `content`
- Moodle `news` forum type -> set `is_pinned` = true
- If forum had grading enabled -> set `is_graded` = true with `points`

---

### FILES

**Table:** `files`

Binary files from the Moodle backup must be uploaded to Supabase Storage bucket `course-materials`, then a record created in the `files` table:

```json
{
  "name": "original_filename.pdf",
  "type": "application/pdf",
  "size": 12345,
  "url": "https://<supabase-url>/storage/v1/object/public/course-materials/<storage-path>",
  "uploaded_by": "uuid (current user)",
  "course_id": "uuid"
}
```

After creating the file record, use its `id` in content blocks:
```json
{ "type": "file", "title": "Download: filename.pdf", "data": { "fileId": "<file-record-id>" } }
```

---

## Moodle Activity -> Learnboard Mapping Summary

| Moodle Activity | Learnboard Entity | Content Block Type | Notes |
|---|---|---|---|
| `page` | Lesson | `text` block | HTML content -> `data.html` |
| `label` | (within lesson) | `label` or `text` block | Banner/divider content |
| `assign` | Assignment + Lesson ref | `assignment` block | Create assignment first, then reference |
| `quiz` | Quiz + Questions + Lesson ref | `quiz` block | Create quiz+questions first, then reference |
| `forum` | Course Discussion | N/A (separate entity) | Create as `course_discussions` row |
| `resource` | File + Lesson | `file` or `pdf` block | Upload file, create record, reference in block |
| `url` | (within lesson) | `embed` or `text` block | External link -> embed or `<a>` in text block |
| `book` | Lesson (multiple text blocks) | `text` blocks | Each chapter = one text block in the lesson |
| `h5pactivity` | Lesson | `embed` block | Flag for review (H5P needs re-upload) |
| `googlemeet` | (note in lesson) | `text` block | Note the meeting link in a text block |
| `choice` | (within lesson) | `text` block | Describe the poll; no direct equivalent |
| `scorm` | Lesson | `embed` block | Flag for manual SCORM upload |

---

## Creation Order (IMPORTANT)

You MUST create entities in this order due to foreign key dependencies:

1. **Course** -> get `course_id`
2. **Course Instructor** -> link user to course
3. **Subjects** (one per Moodle section) -> get `subject_id` for each
4. **Files** (upload binaries, create records) -> get `file_id` for each
5. **Quizzes + Questions** (for quiz activities) -> get `quiz_id` for each
6. **Assignments** (for assignment activities) -> get `assignment_id` for each
7. **Lessons** (one per Moodle activity, with content blocks referencing files/quizzes/assignments)
8. **Discussions** (for forum activities)

---

## Content Transformation Rules

When transforming Moodle HTML for Learnboard:

1. **Replace `@@PLUGINFILE@@/filename`** with the Learnboard file URL after upload, or with `/api/files/<fileId>` format
2. **Preserve semantic HTML**: headings, paragraphs, lists, tables, emphasis
3. **Strip Moodle CSS classes**: `atto_*`, `editor_atto_*`, `img-fluid` and other Moodle-specific classes
4. **Extract YouTube URLs** from iframes and create `video` content blocks instead of leaving as embedded HTML
5. **Extract Google Slides/Docs URLs** from iframes and create `slideshow` or `embed` blocks
6. **Convert relative Moodle URLs** (e.g., `/mod/page/view.php?id=123`) to notes flagging them as non-functional
7. **Do NOT modify** external URLs (Google Drive, Slides, Docs links)

---

## Quality Checks

Before completing migration, verify:

- [ ] Every Moodle section has a corresponding Learnboard subject
- [ ] Every activity in each section's `<sequence>` is present as a lesson in the correct subject
- [ ] Activities are in the correct order (use `order` field matching sequence position)
- [ ] All `@@PLUGINFILE@@` references are resolved or flagged
- [ ] HTML content is well-formed (no double-encoding like `&amp;amp;`)
- [ ] Unix timestamps are converted to ISO 8601
- [ ] Quizzes have their questions created
- [ ] All entities are created as `published: false` for review
- [ ] File-dependent content blocks have valid `fileId` references
- [ ] Course has at least one instructor assigned

---

## Migration Notes to Include

After migration, provide a summary including:

1. **Course created**: title, ID, URL (`https://oecsmypd.org/course/<id>`)
2. **Sections/Subjects created**: count and titles
3. **Lessons created**: count per subject
4. **Quizzes created**: count, with question counts
5. **Assignments created**: count, with due dates
6. **Discussions created**: count
7. **Files uploaded**: count
8. **Skipped/unsupported items**: list any Moodle activities that couldn't be migrated (e.g., SCORM, H5P, workshops) with reasons
9. **External dependencies**: list all Google Drive, YouTube, and other external URLs found, grouped by lesson
10. **Manual steps required**: anything the instructor needs to do post-migration (publish course, set dates, upload SCORM packages, etc.)

---

## Example Workflow

```
User: "Extract the Moodle backup at ./course_backup.mbz and import it into Learnboard"

Agent:
1. Extract: tar -xzf ./course_backup.mbz -C /tmp/mbz_extract
2. Read moodle_backup.xml -> inventory course structure
3. Read course/course.xml -> get course metadata
4. Create course via API/database
5. For each section: create subject
6. For each activity in sequence order:
   a. Read activity XML
   b. If quiz: create quiz + questions first
   c. If assignment: create assignment first
   d. Create lesson with appropriate content blocks
   e. If forum: create discussion
7. Upload any binary files referenced in content
8. Output migration summary
```
