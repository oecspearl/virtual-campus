# Course System Explained - OECS LearnBoard

## Overview
This document explains how courses are created, edited, and accessed by users in the OECS LearnBoard LMS system.

---

## 📝 1. Course Creation

### Who Can Create Courses?
Courses can be created by users with the following roles:
- **Instructor** (`instructor`)
- **Curriculum Designer** (`curriculum_designer`)
- **Admin** (`admin`)
- **Super Admin** (`super_admin`)

### Creation Methods

#### Method 1: Individual Course Creation Page
**Route:** `/courses/create`

**File:** `app/courses/create/page.tsx`

**Process:**
1. User navigates to `/courses/create`
2. Form fields include:
   - Title (required)
   - Description
   - Thumbnail (image upload)
   - Grade Level
   - Difficulty (beginner/intermediate/advanced)
   - Syllabus (rich text editor)
   - Published status (checkbox)
3. On submit, sends `POST` request to `/api/courses`
4. Redirects to course detail page upon success

**API Endpoint:** `POST /api/courses`
- **File:** `app/api/courses/route.ts` (lines 108-172)
- **Authentication:** Required (uses `authenticateUser`)
- **Authorization:** Checks role permissions
- **Database:** Inserts into `courses` table
- **Additional:** Can assign instructors via `instructor_ids` array

#### Method 2: Admin Course Management Page
**Route:** `/admin/courses/manage`

**File:** `app/admin/courses/manage/page.tsx`

**Process:**
1. Admin navigates to course management page
2. Clicks "Add Course" button
3. Modal/form appears with course creation fields
4. Submits via same `POST /api/courses` endpoint
5. Course list refreshes automatically

### Course Data Structure

```typescript
{
  title: string,              // Required
  description: string,
  thumbnail: string | null,   // Image URL
  grade_level: string,
  subject_area: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  syllabus: string,           // HTML content
  published: boolean,         // Default: false
  featured: boolean           // Default: false
}
```

### Database Table: `courses`
- Stores all course metadata
- Includes timestamps (`created_at`, `updated_at`)
- Has `published` flag for visibility control

---

## ✏️ 2. Course Editing

### Who Can Edit Courses?
- **Instructors** (if they're assigned to the course)
- **Curriculum Designers**
- **Admins**
- **Super Admins**

### Editing Methods

#### Method 1: Course Edit Page
**Route:** `/courses/[id]/edit`

**File:** `app/courses/[id]/edit/page.tsx`

**Process:**
1. User navigates to `/courses/[course-id]/edit`
2. Page loads existing course data via `GET /api/courses/[id]`
3. Form pre-populates with current values
4. User modifies fields (title, description, syllabus, etc.)
5. On save, sends `PUT` request to `/api/courses/[id]`
6. Updates course in database
7. Reloads course data to show changes

#### Method 2: Admin Management Page
**Route:** `/admin/courses/manage`

**File:** `app/admin/courses/manage/page.tsx`

**Process:**
1. Admin views list of all courses
2. Clicks "Edit" button on a course
3. Inline editing form appears
4. Modifies course fields
5. Saves via `PUT /api/courses/[id]`
6. Course list updates

### API Endpoint: `PUT /api/courses/[id]`
- **File:** `app/api/courses/[id]/route.ts` (lines 39-93)
- **Authentication:** Currently disabled (TODO: re-enable)
- **Partial Updates:** Only updates fields provided in request body
- **Database:** Updates `courses` table, sets `updated_at` timestamp

### Editable Fields
- `title`
- `description`
- `thumbnail`
- `grade_level`
- `subject_area`
- `difficulty`
- `syllabus`
- `published`
- `featured`

---

## 👥 3. Course Access by Users

### Access Control System

The system uses **role-based access control (RBAC)** to determine what courses users can see and access.

### Course Listing Access (`GET /api/courses`)

**File:** `app/api/courses/route.ts` (lines 6-106)

#### Access Levels by Role:

1. **Admin / Super Admin / Curriculum Designer**
   - **Access:** All courses (published and unpublished)
   - **Query:** No filtering applied
   - **Use Case:** Full system management

2. **Instructor**
   - **Access:** 
     - Courses they teach (via `course_instructors` table)
     - All published courses
   - **Query:** Uses join with `course_instructors` table
   - **Use Case:** Manage their courses, browse available courses

3. **Student**
   - **Access:**
     - Courses they're enrolled in (via `enrollments` → `classes` → `courses`)
     - All published courses
   - **Query:** Complex join through `enrollments` and `classes` tables
   - **Use Case:** Access enrolled courses, discover new courses

4. **Guest / Other Roles**
   - **Access:** Only published courses
   - **Query:** `WHERE published = true`
   - **Use Case:** Public course browsing

### Course Detail Page Access

**Route:** `/course/[id]`

**File:** `app/course/[id]/page.tsx`

**Process:**
1. User navigates to course detail page
2. Page fetches course data via `GET /api/courses/[id]`
3. **No access restrictions** at API level (allows viewing)
4. Page checks enrollment status for students
5. Shows different UI based on:
   - Enrollment status
   - User role
   - Course published status

### Enrollment System

#### How Students Access Courses

**Enrollment Flow:**
1. Student views course detail page (`/course/[id]`)
2. If not enrolled, sees "Enroll" button
3. Clicks "Enroll" → calls `POST /api/courses/[id]/enroll`
4. Creates record in `enrollments` table:
   - Links student to course via `class_id`
   - Sets status to `active`
   - Records `enrolled_at` timestamp
5. Student can now access course content

**Enrollment API:** `POST /api/courses/[id]/enroll`
- **File:** `app/api/courses/[id]/enroll/route.ts`
- **Checks:** 
  - Course exists and is available
  - User not already enrolled
  - Handles re-enrollment if previously dropped

**Drop Enrollment:** `DELETE /api/courses/[id]/enroll`
- Updates enrollment status to `dropped`
- Student loses access to course content

### Course Content Access

Once enrolled or with appropriate role, users can access:

1. **Lessons** (`/api/lessons?course_id=[id]`)
   - Ordered by `order` field
   - Contains educational materials

2. **Gradebook** (`/api/courses/[id]/gradebook`)
   - Students: View their own grades
   - Instructors/Admins: View all student grades
   - Requires enrollment or instructor/admin role

3. **Announcements** (`/api/courses/[id]/announcements`)
   - Only visible to enrolled students and instructors

4. **Discussions** (`/api/courses/[id]/discussions`)
   - Course-specific discussion threads

5. **Participants** (`/api/courses/[id]/participants`)
   - List of enrolled students
   - Only visible to instructors/admins

### Access Verification Functions

The system uses helper functions to check access:

```typescript
// Check if user is enrolled in a course
async function checkEnrollment(
  supabase: any, 
  userId: string, 
  courseId: string
): Promise<boolean>
```

This function:
- Queries `enrollments` table
- Joins with `classes` to get course relationship
- Checks for `active` enrollment status
- Returns `true` if enrolled, `false` otherwise

---

## 🔐 4. Security & Permissions

### Authentication
- All API endpoints use `authenticateUser()` function
- Requires valid session token
- Extracts user ID and profile from session

### Authorization Checks
- Role-based permissions via `hasRole()` function
- Course creation: Requires instructor/curriculum_designer/admin role
- Course editing: Typically requires instructor assignment or admin role
- Course deletion: Only admin/super_admin

### Row-Level Security (RLS)
- Supabase RLS policies enforce database-level access control
- Service client used in some cases to bypass RLS for system operations
- Regular client respects RLS policies

---

## 📊 5. Database Schema

### Key Tables

1. **`courses`**
   - Stores course metadata
   - Fields: id, title, description, thumbnail, grade_level, subject_area, difficulty, syllabus, published, featured, created_at, updated_at

2. **`course_instructors`**
   - Links instructors to courses
   - Fields: course_id, instructor_id

3. **`classes`**
   - Represents course instances/sections
   - Links to courses via `course_id`
   - Has enrollment limits, schedules, etc.

4. **`enrollments`**
   - Links students to classes (and thus courses)
   - Fields: student_id, class_id, status (active/dropped), enrolled_at, progress_percentage

5. **`lessons`**
   - Educational content within courses
   - Linked via `course_id`
   - Ordered by `order` field

---

## 🔄 6. Course Lifecycle

1. **Creation**
   - Course created with `published: false` by default
   - Only visible to admins/curriculum designers

2. **Development**
   - Instructors/designers add lessons, materials
   - Course remains unpublished

3. **Publishing**
   - Admin/instructor sets `published: true`
   - Course becomes visible to all users
   - Students can enroll

4. **Active Use**
   - Students enroll and access content
   - Instructors manage content and grades
   - Progress tracked in `enrollments` table

5. **Archiving** (if implemented)
   - Course can be unpublished
   - Existing enrollments may remain active
   - New enrollments disabled

---

## 📍 7. Key Routes & Endpoints

### Frontend Routes
- `/courses` - Course listing page
- `/courses/create` - Create new course
- `/course/[id]` - Course detail page
- `/courses/[id]/edit` - Edit course page
- `/admin/courses/manage` - Admin course management

### API Endpoints
- `GET /api/courses` - List courses (role-filtered)
- `POST /api/courses` - Create course
- `GET /api/courses/[id]` - Get course details
- `PUT /api/courses/[id]` - Update course
- `DELETE /api/courses/[id]` - Delete course
- `POST /api/courses/[id]/enroll` - Enroll in course
- `DELETE /api/courses/[id]/enroll` - Drop course
- `GET /api/courses/[id]/gradebook` - Get gradebook
- `GET /api/courses/[id]/participants` - Get enrolled students

---

## 🎯 Summary

**Course Creation:**
- Restricted to instructors, curriculum designers, and admins
- Done via `/courses/create` or admin management page
- Creates record in `courses` table

**Course Editing:**
- Same permissions as creation
- Done via `/courses/[id]/edit` or admin management
- Updates `courses` table with new values

**Course Access:**
- **Admins/Designers:** See all courses
- **Instructors:** See their courses + published courses
- **Students:** See enrolled courses + published courses
- **Guests:** See only published courses
- **Enrollment:** Required for students to access course content
- **Access Control:** Enforced at API level via role-based filtering

The system provides a comprehensive course management system with proper access control, enrollment tracking, and role-based permissions.

