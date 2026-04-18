# 📚 Course Materials Guide - OECS LearnBoard

## Overview
OECS LearnBoard uses a hierarchical structure for organizing educational content:

```
Course → Subjects → Lessons → Materials
```

## 🏗️ Content Structure

### 1. **Courses**
- Top-level containers for educational content
- Contains metadata (title, description, difficulty, etc.)
- Can have multiple subjects

### 2. **Subjects** 
- Major topics within a course
- Examples: "Introduction to Algebra", "Caribbean History", "Environmental Science"
- Contains multiple lessons

### 3. **Lessons**
- Individual learning units within subjects
- Contains the actual educational materials
- Has two main content areas:
  - **Content**: Interactive learning materials
  - **Resources**: Supporting files and references

### 4. **Materials** (Content & Resources) - 12 Content Types Available

#### Core Content Types:
1. **📝 Text Content** - Rich text content with formatting
2. **🎥 Video Content** - YouTube, Vimeo, embedded videos
3. **🎬 Interactive Video** - Videos with embedded questions at checkpoints
4. **🎵 Audio/Podcast** - Audio file uploads with interactive player
5. **💻 Code Sandbox** - Interactive code editor with execution
6. **🖼️ Images** - Image uploads and displays
7. **📄 PDF Documents** - PDF uploads and viewers
8. **📎 File Uploads** - Any file type for download
9. **🔗 Embedded Content** - External content embedding
10. **📊 Slideshows** - External presentation embeds
11. **❓ Quizzes** - Interactive assessments
12. **📋 Assignments** - Student work tasks

## 🎯 How to Add Materials to Courses

### Step 1: Access Course Management
1. **Sign in** to OECS LearnBoard with instructor/admin credentials
2. **Navigate** to `/manage-lessons` or `/courses`
3. **Select** the course you want to add materials to

### Step 2: Create/Edit Subjects
1. **Go to** `/courses/[course-id]` 
2. **Click** "Add Subject" or edit existing subject
3. **Fill in**:
   - Subject title
   - Description
   - Learning objectives
   - Estimated duration

### Step 3: Create Lessons
1. **Navigate** to `/manage-lessons`
2. **Select** the subject
3. **Click** "Create Lesson" or edit existing lesson
4. **Fill in** basic lesson information:
   - Title
   - Description
   - Learning outcomes
   - Estimated time
   - Difficulty level (1-5)

### Step 4: Add Content Materials
**Access**: `/lessons/[lesson-id]/edit`

#### A. Text Content
- **Click** "Add Text Block"
- **Use** the rich text editor
- **Supports**: Headings, lists, links, formatting
- **Perfect for**: Instructions, explanations, reading material

#### B. Video Content
- **Click** "Add Video"
- **Upload** video files or embed from YouTube/Vimeo
- **Supports**: MP4, WebM, MOV formats
- **Perfect for**: Lectures, demonstrations, tutorials

#### B2. Interactive Video (NEW)
- **Click** "Add Interactive Video"
- **Upload** video file or use YouTube/Vimeo URL
- **Add checkpoints** at specific timestamps
- **Create questions** (multiple choice, true/false, short answer)
- **Set feedback** and points for each checkpoint
- **Perfect for**: Step-by-step tutorials, case studies, knowledge checks

#### B3. Audio/Podcast Content (NEW)
- **Click** "Add Audio/Podcast"
- **Upload** audio files (MP3, WAV, OGG, M4A)
- **Add transcript** for accessibility (optional)
- **Features**: Playback speed control, volume, download
- **Perfect for**: Language learning, lectures, interviews

#### B4. Code Sandbox (NEW)
- **Click** "Add Code Sandbox"
- **Select** programming language (JavaScript, Python, HTML/CSS, etc.)
- **Enter** initial code or use template
- **Add instructions** for learning objectives
- **Enable read-only mode** for demonstrations
- **Perfect for**: Programming courses, coding exercises, technical training

#### C. File Attachments
- **Click** "Add File"
- **Upload**: PDFs, images, documents
- **Supports**: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, GIF
- **Perfect for**: Handouts, worksheets, reference materials

#### D. Slideshow Presentations
- **Click** "Add Slideshow"
- **Upload** PowerPoint or PDF presentations
- **Supports**: PPT, PPTX, PDF formats
- **Perfect for**: Lecture slides, visual presentations

#### E. Embedded Content
- **Click** "Add Embed"
- **Paste** embed codes from external sources
- **Supports**: YouTube, Vimeo, interactive tools
- **Perfect for**: External simulations, interactive content

### Step 5: Add Resource Materials
**Same interface** as content, but organized separately:

#### Resource Types:
- **Reference Documents**: Additional reading materials
- **Downloadable Files**: Worksheets, templates, guides
- **External Links**: Supplementary websites, tools
- **Media Files**: Audio, images, videos for reference

### Step 6: Create Assessments

#### A. Quizzes
1. **Navigate** to `/quizzes/create`
2. **Link** to specific lesson or create standalone
3. **Add questions**:
   - Multiple choice
   - True/False
   - Short answer
   - Essay
   - Fill in the blank
   - Matching
4. **Configure**:
   - Time limits
   - Attempts allowed
   - Passing score
   - Feedback settings

#### B. Assignments
1. **Navigate** to `/assignments/create`
2. **Set** assignment details:
   - Title and description
   - Due date
   - Points/weight
   - Instructions
3. **Attach** files or resources
4. **Configure** submission settings

## 🔧 Technical Implementation

### Database Schema
```sql
-- Lessons table structure
CREATE TABLE lessons (
    id UUID PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB DEFAULT '[]'::jsonb,  -- Interactive materials
    resources JSONB DEFAULT '[]'::jsonb, -- Supporting files
    learning_outcomes TEXT[],
    lesson_instructions TEXT,
    estimated_time INTEGER,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    published BOOLEAN DEFAULT false
);
```

### Content Structure (JSONB)
```json
{
  "content": [
    {
      "type": "text",
      "title": "Introduction",
      "data": "<p>Welcome to this lesson...</p>"
    },
    {
      "type": "video", 
      "title": "Main Video",
      "data": {
        "fileId": "uuid",
        "name": "lesson-video.mp4"
      }
    },
    {
      "type": "file",
      "title": "Worksheet",
      "data": {
        "fileId": "uuid", 
        "name": "worksheet.pdf"
      }
    }
  ],
  "resources": [
    {
      "type": "file",
      "title": "Reference Guide",
      "data": {
        "fileId": "uuid",
        "name": "reference.pdf"
      }
    }
  ]
}
```

## 🎨 User Interface

### Lesson Editor (`/lessons/[id]/edit`)
- **Drag & drop** content blocks
- **Rich text editor** for text content
- **File upload** with progress indicators
- **Preview mode** to test content
- **Auto-save** functionality

### Content Block Types
1. **Text Block**: Rich text editor
2. **Video Block**: File upload + embed support
3. **File Block**: Document/image upload
4. **Slideshow Block**: Presentation upload
5. **Embed Block**: External content embedding

## 📁 File Management

### Upload Process
1. **Select** file type (video, document, image)
2. **Upload** via `/api/media/upload`
3. **Store** metadata in `files` table
4. **Reference** by file ID in lesson content

### Supported Formats
- **Videos**: MP4, WebM, MOV, AVI
- **Documents**: PDF, DOC, DOCX, PPT, PPTX, TXT
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Audio**: MP3, WAV, OGG

## 🔐 Permissions & Access Control

### Who Can Add Materials?
- **Instructors**: Full access to their courses
- **Curriculum Designers**: Can edit any course content
- **Admins**: Full system access
- **Super Admins**: Complete control

### Student Access
- **Published content only**
- **Sequential access** (can be configured)
- **Progress tracking** for completion

## 🚀 Best Practices

### Content Organization
1. **Start** with clear learning objectives
2. **Structure** content logically (intro → main → conclusion)
3. **Mix** different content types for engagement
4. **Include** both content and resources
5. **Test** all materials before publishing

### File Management
1. **Use descriptive** file names
2. **Optimize** file sizes for web delivery
3. **Provide** alternative formats when possible
4. **Include** accessibility features (alt text, captions)

### Assessment Integration
1. **Align** quizzes with learning objectives
2. **Provide** clear instructions
3. **Set** appropriate time limits
4. **Include** feedback for learning

## 🔍 Troubleshooting

### Common Issues
1. **File upload fails**: Check file size limits and format support
2. **Content not saving**: Verify user permissions and network connection
3. **Videos not playing**: Check browser compatibility and file format
4. **Embedded content not loading**: Verify embed code and external site permissions

### Getting Help
- **Check** browser console for errors
- **Verify** user permissions
- **Test** with different file formats
- **Contact** system administrator for technical issues

## 📈 Next Steps

1. **Create** your first course and subject
2. **Add** a lesson with mixed content types
3. **Upload** supporting files and resources
4. **Create** a quiz to test understanding
5. **Publish** and test the complete experience

---

**Need Help?** Contact the OECS LearnBoard support team at mypdoecs@gmail.com


























