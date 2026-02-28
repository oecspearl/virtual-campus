# Resource Links Feature Setup Guide

## Overview
This feature allows instructors and administrators to add external resource links to both courses and lessons. These links appear in the sidebar for easy access by students and teachers.

## Database Setup

### Step 1: Run the SQL Schema
Execute the SQL file in your Supabase SQL editor:

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Click "New Query"
# 3. Copy and paste the contents of create-resource-links-schema.sql
# 4. Click "Run"
```

**Note**: The SQL file is designed to work even if some referenced tables (courses, lessons, users) don't exist yet. It will create the table and add foreign key constraints only when the referenced tables are available.

### Step 2: Verify the Table
After running the SQL, verify that the table was created:

```sql
SELECT * FROM resource_links LIMIT 1;
```

### Step 3: Update RLS Policies (Optional, for better security)
Once your main tables (courses, lessons, users) exist and are populated, you can update the RLS policies for better security. The current policies allow all operations for simplicity during setup.

## Features

### For Students
- **View Resource Links**: Students can see all published resource links in the course/lesson sidebar
- **Access Links**: Click any link to open it in a new tab
- **Organized Display**: Links are displayed with icons and descriptions

### For Instructors/Admins
- **Add Links**: Click the "+" button in the Resource Links card to add new links
- **Edit Links**: Hover over a link and click the edit icon to modify it
- **Delete Links**: Hover over a link and click the delete icon to remove it
- **Link Types**: Categorize links as:
  - External Link
  - Document
  - Video
  - Article
  - Tool
  - Other

## How to Use

### Adding a Resource Link to a Course

1. Navigate to the course page
2. In the sidebar, find the "Resource Links" card
3. Click the "+" button in the top right
4. Fill in the form:
   - **Title** (required): Name of the resource
   - **URL** (required): The full URL (must include https://)
   - **Description** (optional): Brief description of what the resource is
   - **Type**: Choose from dropdown (Document, Video, Article, Tool, etc.)
5. Click "Add Link"

### Adding a Resource Link to a Lesson

1. Navigate to a lesson page
2. In the sidebar, find the "Resource Links" card
3. Click the "+" button in the top right
4. Fill in the form with the same fields as above
5. Click "Add Link"

### Editing a Resource Link

1. Hover over the link you want to edit
2. Click the edit icon (pencil)
3. Modify the fields as needed
4. Click "Update"

### Deleting a Resource Link

1. Hover over the link you want to delete
2. Click the delete icon (trash)
3. Confirm the deletion

## Technical Details

### Database Schema

```sql
CREATE TABLE resource_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    link_type VARCHAR(50) DEFAULT 'external',
    icon VARCHAR(100),
    "order" INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### Get Resource Links
```http
GET /api/resource-links?courseId={courseId}
GET /api/resource-links?lessonId={lessonId}
```

#### Create Resource Link
```http
POST /api/resource-links
Content-Type: application/json

{
  "courseId": "uuid",
  "lessonId": "uuid",
  "title": "Resource Title",
  "url": "https://example.com",
  "description": "Optional description",
  "link_type": "external"
}
```

#### Update Resource Link
```http
PUT /api/resource-links/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "url": "https://updated-example.com",
  "description": "Updated description",
  "link_type": "video"
}
```

#### Delete Resource Link
```http
DELETE /api/resource-links/{id}
```

### Permissions

**Viewing**: 
- Students can view published links for courses/lessons they're enrolled in
- Instructors can view all links for courses they teach

**Managing**:
- Only instructors, curriculum_designers, admins, and super_admins can add/edit/delete links
- Row Level Security (RLS) enforces these permissions

## Integration Points

### Course Page
The Resource Links Sidebar appears in the right sidebar of the course detail page (`/course/[id]`).

### Lesson Page
The Resource Links Sidebar appears in the right sidebar of the lesson viewer page (`/course/[id]/lesson/[lessonId]`).

## UI Components

### ResourceLinksSidebar Component
Located at: `app/components/ResourceLinksSidebar.tsx`

**Props**:
- `courseId` (optional): Course ID for course-level links
- `lessonId` (optional): Lesson ID for lesson-level links

**Features**:
- Display list of links with icons
- Add/edit/delete functionality (instructor-only)
- Loading states
- Empty state messaging
- Responsive design

## Best Practices

1. **Descriptive Titles**: Use clear, descriptive titles that help users understand what the link is about
2. **Complete URLs**: Always include the protocol (https://) when adding URLs
3. **Categorize**: Use appropriate link types to help users find what they're looking for
4. **Add Descriptions**: Write helpful descriptions to provide context
5. **Keep Updated**: Regularly review and update links to ensure they're still valid and relevant

## Examples

### Course-Level Links
Examples of links you might add at the course level:
- Course textbook website
- Official documentation
- Supplementary reading materials
- Course tools and software
- Discussion forums

### Lesson-Level Links
Examples of links you might add at the lesson level:
- Specific tutorial or guide
- Reference materials for a particular topic
- Interactive tools for that lesson
- Example projects or demos
- Additional readings

## Troubleshooting

### Links Not Appearing
1. Check that you ran the SQL schema successfully
2. Verify you have the correct permissions (instructor/admin)
3. Check browser console for errors
4. Ensure the course/lesson is published (if viewing as student)

### Cannot Add Links
1. Verify your user role is instructor, curriculum_designer, admin, or super_admin
2. Check that you're logged in
3. Try refreshing the page

### Permission Errors
- Ensure Row Level Security (RLS) policies are properly set
- Check that your user role is correct in the database
- Verify that RLS is enabled on the resource_links table

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the API responses in the Network tab
3. Verify database permissions in Supabase
4. Contact the development team with specific error details

