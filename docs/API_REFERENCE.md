# Learnboard LMS — API Reference

> Comprehensive API documentation for third-party integrations.

**Base URL:** `https://oecsmypd.org/api`
**Content Type:** `application/json` (unless specified otherwise)
**Version:** 1.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Roles & Permissions](#roles--permissions)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Courses](#courses)
6. [Lessons](#lessons)
7. [Assignments](#assignments)
8. [Quizzes](#quizzes)
9. [Discussions](#discussions)
10. [Surveys](#surveys)
11. [Enrollments](#enrollments)
12. [Progress & Analytics](#progress--analytics)
13. [Users & Auth](#users--auth)
14. [Notifications](#notifications)
15. [Files & Media](#files--media)
16. [Certificates](#certificates)
17. [AI Features](#ai-features)
18. [Conferences](#conferences)
19. [Gamification](#gamification)
20. [LTI Integration](#lti-integration)
21. [SCORM](#scorm)
22. [Search](#search)
23. [Student Features](#student-features)
24. [Programmes & Learning Paths](#programmes--learning-paths)
25. [OneRoster](#oneroster)
26. [Admin Settings](#admin-settings)
27. [Cron / Scheduled Tasks](#cron--scheduled-tasks)
28. [Utility](#utility)
29. [Content Block Types](#content-block-types)

---

## Authentication

Learnboard uses **Supabase Auth** with two authentication methods:

### Cookie-Based Session (Browser)

The default for frontend use. The Supabase session cookie is automatically sent with requests.

### Bearer Token (API)

For third-party integrations, pass a valid Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

**Obtaining a token:**

```bash
curl -X POST https://<supabase-url>/auth/v1/token?grant_type=password \
  -H "apikey: <supabase_anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Response includes `access_token` and `refresh_token`.

---

## Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Full system control | All permissions |
| `admin` | Administrative access | Manage users, access admin panel |
| `curriculum_designer` | Curriculum design | Design curriculum, create courses |
| `instructor` | Teaching access | Create courses, grade, manage content |
| `student` | Learner access | View courses, submit work, track progress |
| `parent` | Parent/guardian | View student progress |

Most endpoints requiring `instructor` also accept `curriculum_designer`, `admin`, and `super_admin`.

---

## Error Handling

All errors return JSON:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details (optional)"
}
```

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Authentication required |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `GET /api/auth/profile` | 200 req/min |
| `PUT /api/auth/profile` | 10 req/min |
| General endpoints | No hard limit (serverless) |

Headers returned:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 197
X-RateLimit-Reset: 2026-02-11T23:00:00.000Z
```

---

## Courses

### List Courses

```
GET /api/courses
```

Role-based filtering: admins see all; instructors see their courses + published; students see enrolled + published; guests see published only.

| Parameter | Type | Description |
|-----------|------|-------------|
| `difficulty` | string | `beginner`, `intermediate`, `advanced` |
| `subject_area` | string | Filter by subject |
| `instructorId` | UUID | Filter by instructor |
| `category` | UUID | Filter by category |

**Auth:** Optional

**Response:**

```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Introduction to Biology",
      "description": "A comprehensive biology course",
      "thumbnail": "https://...",
      "grade_level": "Undergraduate",
      "subject_area": "Science",
      "difficulty": "beginner",
      "modality": "self_paced",
      "syllabus": "...",
      "published": true,
      "featured": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-02-01T14:30:00Z"
    }
  ],
  "userRole": "instructor",
  "accessType": "teaching_and_published"
}
```

### Create Course

```
POST /api/courses
```

**Auth:** Required — `instructor`, `curriculum_designer`, `admin`, `super_admin`

```json
{
  "title": "Introduction to Biology",
  "description": "A comprehensive biology course",
  "thumbnail": "https://example.com/thumb.jpg",
  "grade_level": "Undergraduate",
  "subject_area": "Science",
  "difficulty": "beginner",
  "modality": "self_paced",
  "estimated_duration": "40 hours",
  "syllabus": "Week 1: Cell Biology...",
  "published": false,
  "featured": false,
  "instructor_ids": ["uuid-1", "uuid-2"]
}
```

### Get Course

```
GET /api/courses/:id
```

**Auth:** Optional

### Update Course

```
PUT /api/courses/:id
```

**Auth:** Required — course instructor or admin. Partial updates supported.

```json
{
  "title": "Updated Title",
  "published": true
}
```

### Delete Course

```
DELETE /api/courses/:id
```

**Auth:** Required — `admin`, `super_admin`. Cascade deletes all related records.

```json
{ "success": true, "message": "Course deleted successfully" }
```

### Enroll in Course

```
POST /api/courses/:id/enroll
```

**Auth:** Required

```json
{ "student_id": "uuid" }
```

### Featured Courses

```
GET /api/courses/featured
```

### Clone Course

```
POST /api/courses/:id/clone
```

**Auth:** Required — `instructor`+

### Import Course (Moodle Backup)

Three-step process:

**Step 1 — Get Upload URL:**

```
POST /api/courses/import/upload-url
```

```json
{ "fileName": "backup-moodle.mbz" }
```

Response:

```json
{
  "signedUrl": "https://supabase-storage.../upload?token=...",
  "token": "...",
  "path": "temp-imports/...",
  "storagePath": "temp-imports/1707685200000-backup-moodle.mbz"
}
```

**Step 2 — Upload file to signed URL:**

```
PUT <signedUrl>
Content-Type: application/octet-stream
Body: <binary file>
```

**Step 3 — Process Import:**

```
POST /api/courses/import/moodle
```

```json
{
  "storagePath": "temp-imports/1707685200000-backup-moodle.mbz",
  "fileName": "backup-moodle.mbz",
  "courseName": "My Course Name"
}
```

Response:

```json
{
  "success": true,
  "course": { "id": "uuid", "title": "My Course Name" },
  "imported": {
    "subjects": 5, "lessons": 23, "quizzes": 3,
    "assignments": 4, "discussions": 2, "files": 12
  },
  "errors": [],
  "warnings": ["SCORM activity not supported"]
}
```

### Other Course Endpoints

```
GET/POST  /api/courses/:id/categories
GET/POST  /api/courses/:id/groups
POST      /api/courses/:id/gradebook/upload
GET       /api/courses/:id/curriculum-assignments
GET       /api/courses/:id/curriculum-quizzes
```

---

## Lessons

### List Lessons

```
GET /api/lessons
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `subject_id` | UUID | Filter by subject |
| `course_id` | UUID | Filter by course |

**Auth:** Optional (unpublished hidden for non-instructors)

```json
{
  "lessons": [
    {
      "id": "uuid",
      "course_id": "uuid",
      "subject_id": "uuid",
      "title": "Cell Biology Basics",
      "description": "Introduction to cell structure",
      "content": [
        { "type": "text", "title": "Overview", "data": "<p>HTML content</p>" },
        { "type": "video", "title": "Lecture", "data": { "url": "https://youtube.com/..." } }
      ],
      "resources": [],
      "order": 0,
      "published": true,
      "estimated_time": 30,
      "difficulty": 1,
      "learning_outcomes": ["Identify cell structures"],
      "lesson_instructions": "<p>Read carefully</p>"
    }
  ]
}
```

### Create Lesson

```
POST /api/lessons
```

**Auth:** Required — `instructor`+

```json
{
  "course_id": "uuid",
  "subject_id": "uuid",
  "title": "Cell Biology Basics",
  "description": "Introduction to cell structure",
  "order": 0,
  "learning_outcomes": ["Identify cell structures"],
  "lesson_instructions": "<p>Read carefully</p>",
  "content": [
    { "type": "text", "title": "Overview", "data": "<p>HTML content</p>" }
  ],
  "resources": [],
  "estimated_time": 30,
  "difficulty": 1,
  "published": false
}
```

### Get / Update / Delete Lesson

```
GET    /api/lessons/:id
PUT    /api/lessons/:id
DELETE /api/lessons/:id
```

### Reorder Lessons

```
POST /api/lessons/reorder
```

```json
{
  "lesson_order": [
    { "lesson_id": "uuid-1", "order": 0 },
    { "lesson_id": "uuid-2", "order": 1 }
  ]
}
```

---

## Assignments

### List Assignments

```
GET /api/assignments
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `lesson_id` | UUID | Filter by lesson |
| `published` | boolean | Filter by status |

**Auth:** Required

### Create Assignment

```
POST /api/assignments
```

**Auth:** Required — `instructor`+

```json
{
  "lesson_id": "uuid",
  "course_id": "uuid",
  "title": "Lab Report #1",
  "description": "<p>Write a lab report...</p>",
  "due_date": "2026-03-15T23:59:00Z",
  "points": 100,
  "submission_types": ["file", "text"],
  "file_types_allowed": [".pdf", ".docx"],
  "max_file_size": 10485760,
  "rubric": [
    { "criterion": "Analysis", "points": 40, "description": "..." }
  ],
  "allow_late_submissions": true,
  "late_penalty": 10,
  "published": true,
  "show_in_curriculum": true,
  "curriculum_order": 0
}
```

Auto-adds to lesson content and creates gradebook item.

### Get / Update / Delete Assignment

```
GET    /api/assignments/:id
PUT    /api/assignments/:id     — syncs with gradebook
DELETE /api/assignments/:id     — cascade cleanup
```

### Submissions

```
GET  /api/assignments/:id/submissions?student_id=uuid
POST /api/assignments/:id/submissions
```

**Submit:**

```json
{
  "student_id": "uuid",
  "submission_content": "<p>My lab report...</p>",
  "files": ["file-uuid-1"],
  "submitted_at": "2026-03-14T18:30:00Z"
}
```

### Grade Submission

```
PUT /api/assignments/:id/submissions/:submissionId/grade
```

**Auth:** Required — `instructor`

```json
{
  "score": 85,
  "feedback": "Excellent analysis.",
  "rubric_scores": [
    { "criterion": "Analysis", "score": 35, "feedback": "..." }
  ]
}
```

### Peer Review

```
GET/POST /api/assignments/:id/peer-review
```

---

## Quizzes

### List Quizzes

```
GET /api/quizzes
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `lesson_id` | UUID | Filter by lesson |
| `course_id` | UUID | Filter by course |
| `published` | boolean | Filter by status |

### Create Quiz

```
POST /api/quizzes
```

**Auth:** Required — `instructor`+

```json
{
  "lesson_id": "uuid",
  "course_id": "uuid",
  "title": "Chapter 1 Quiz",
  "description": "Test your knowledge",
  "instructions": "30 minutes, 2 attempts allowed.",
  "time_limit": 30,
  "attempts_allowed": 2,
  "show_correct_answers": true,
  "show_feedback": true,
  "randomize_questions": true,
  "randomize_answers": false,
  "passing_score": 70,
  "points": 100,
  "published": true,
  "proctored_mode": false,
  "proctor_settings": {}
}
```

### Get / Update / Delete Quiz

```
GET    /api/quizzes/:id
PUT    /api/quizzes/:id
DELETE /api/quizzes/:id
```

### Questions

```
GET    /api/quizzes/:id/questions
POST   /api/quizzes/:id/questions
PUT    /api/quizzes/:id/questions/:questionId
DELETE /api/quizzes/:id/questions/:questionId
```

Types: `multiple_choice`, `true_false`, `short_answer`, `essay`, `matching`, `fill_in_blank`

### Submit Quiz Attempt

```
POST /api/quizzes/:id/attempts/:attemptId/submit
```

```json
{
  "answers": [
    { "question_id": "uuid", "answer": "B" },
    { "question_id": "uuid", "answer": "True" }
  ],
  "time_spent": 1245,
  "proctor_data": {}
}
```

### Other Quiz Endpoints

```
POST /api/quizzes/proctor-log    — Log proctoring event
POST /api/quizzes/upload         — Bulk import quizzes
```

---

## Discussions

### Get Discussion Grades

```
GET /api/discussions/:id/grades
```

**Auth:** Required — students see own grade; instructors see all with stats.

```json
{
  "discussion": { "id": "uuid", "title": "..." },
  "students": [],
  "grades": [],
  "stats": { "totalPosts": 45, "avgWordCount": 150 }
}
```

### Grade Participation

```
POST /api/discussions/:id/grades
```

**Auth:** Required — `instructor`+

```json
{
  "student_id": "uuid",
  "score": 90,
  "rubric_scores": [{ "criterion": "Engagement", "score": 20 }],
  "feedback": "Excellent contributions."
}
```

### Bulk Grade

```
PUT /api/discussions/:id/grades
```

```json
{
  "grades": [
    { "student_id": "uuid-1", "score": 90, "feedback": "..." },
    { "student_id": "uuid-2", "score": 75, "feedback": "..." }
  ]
}
```

### Other Discussion Endpoints

```
GET/POST/PUT  /api/discussions/global/:id       — Global discussions
GET/POST      /api/discussions/rubric-templates  — Rubric templates
POST          /api/discussions/vote              — Vote on post
```

---

## Surveys

### List / Create

```
GET  /api/surveys
POST /api/surveys
```

**Auth:** Required — `instructor`+ for creation

```json
{
  "title": "End-of-Course Survey",
  "description": "Share your feedback",
  "course_id": "uuid",
  "is_anonymous": true,
  "allow_multiple_responses": false,
  "start_date": "2026-03-01T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z",
  "published": true
}
```

### CRUD / Questions / Responses / Analytics

```
GET/PUT/DELETE  /api/surveys/:id
GET/POST        /api/surveys/:id/questions
PUT/DELETE      /api/surveys/:id/questions/:questionId
GET/POST        /api/surveys/:id/responses
GET             /api/surveys/:id/responses/:responseId
GET             /api/surveys/:id/analytics
GET             /api/surveys/:id/analytics/export
GET/POST        /api/surveys/templates
GET             /api/surveys/templates/:templateId
POST            /api/surveys/upload
```

---

## Enrollments

### List Enrollments

```
GET /api/enrollments?me=1
```

**Auth:** Optional (`me=1` requires auth)

### Admin Enrollment Management

**Auth:** Required — `admin`+

```
GET    /api/admin/enrollments                              — List with user data
POST   /api/admin/enrollments                              — Create/reactivate
DELETE /api/admin/enrollments?course_id=uuid&student_id=uuid — Drop student
```

**Create:**

```json
{
  "course_id": "uuid",
  "student_id": "uuid",
  "status": "active"
}
```

---

## Progress & Analytics

### Student Progress

```
GET /api/progress/:studentId/course/:courseId
```

**Auth:** Required — self or admin

```json
{
  "total": 15,
  "completed": 8,
  "percentage": 53.3,
  "lessons": [
    {
      "lesson_id": "uuid",
      "title": "Cell Biology Basics",
      "order": 0,
      "completed": true,
      "completed_at": "2026-02-10T14:30:00Z",
      "status": "completed"
    }
  ]
}
```

### Update Progress

```
POST /api/progress/:studentId/course/:courseId
```

**Auth:** Required — self only

```json
{
  "lesson_id": "uuid",
  "status": "completed",
  "completed_at": "2026-02-11T10:00:00Z"
}
```

### Other Progress Endpoints

```
GET  /api/progress/:studentId/:lessonId   — Lesson-level progress
```

### Analytics (Admin)

```
GET  /api/admin/analytics          — Dashboard data
GET  /api/analytics/course-stats   — Course statistics
GET  /api/analytics/at-risk        — At-risk students
GET  /api/analytics/performance    — Performance metrics
POST /api/analytics/export         — Export report
POST /api/analytics/refresh        — Refresh cache
```

---

## Users & Auth

### Get Profile

```
GET /api/auth/profile
```

**Auth:** Required | **Rate Limit:** 200 req/min

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "instructor",
  "bio": "Biology professor",
  "avatar": "https://...",
  "phone_number": "+1234567890",
  "learning_preferences": {},
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-02-11T10:00:00Z"
}
```

### Update Profile

```
PUT /api/auth/profile
```

**Auth:** Required | **Rate Limit:** 10 req/min

```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "phone_number": "+1234567890",
  "learning_preferences": { "theme": "dark" }
}
```

### Upload Avatar

```
POST /api/auth/profile/upload-avatar
Content-Type: multipart/form-data
```

### Change Password

```
POST /api/auth/change-password
```

```json
{ "current_password": "old", "new_password": "new" }
```

### Admin User Management

```
GET    /api/admin/users                        — List users (with last_login)
POST   /api/admin/users                        — Create or bulk CSV import
GET    /api/admin/users/:id                    — Get user
PUT    /api/admin/users/:id                    — Update user
DELETE /api/admin/users/:id                    — Delete user
POST   /api/admin/users/:id/reset-password     — Reset password
GET    /api/admin/users/:id/progress           — Progress across courses
GET    /api/admin/users/:id/progress/export    — Export progress
POST   /api/admin/users/invite                 — Send invitation
POST   /api/admin/users/bulk-email             — Bulk email
POST   /api/admin/users/bulk-update            — Bulk update
POST   /api/admin/users/upload                 — CSV upload
GET    /api/admin/users/report                 — Analytics report
```

**Create User:**

```json
{ "email": "new@example.com", "name": "New User", "role": "student", "password": "temp123" }
```

**Bulk CSV:**

```json
{ "csv": "email,name,role\nuser1@test.com,User One,student\nuser2@test.com,User Two,instructor" }
```

---

## Notifications

### Preferences

```
GET /api/notifications/preferences
PUT /api/notifications/preferences
```

```json
{
  "email_enabled": true,
  "in_app_enabled": true,
  "push_enabled": true,
  "sms_enabled": false,
  "whatsapp_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "digest_frequency": "daily"
}
```

### Other

```
GET  /api/notifications/in-app               — In-app notifications
POST /api/notifications/in-app/mark-all-read — Mark all read
POST /api/notifications/email/send           — Send email
POST /api/notifications/push/subscribe       — Subscribe to push
POST /api/notifications/test                 — Test notification
```

---

## Files & Media

### Upload Files

```
POST /api/files
Content-Type: multipart/form-data
```

**Auth:** Required | **Max:** 50MB per file

| Field | Type | Description |
|-------|------|-------------|
| `files` / `file` | File | File(s) to upload |
| `course_id` | UUID | Associated course |
| `lesson_id` | UUID | Associated lesson |
| `folder` | string | Storage folder |

```json
{
  "success": true,
  "files": [
    { "id": "uuid", "filename": "report.pdf", "mimetype": "application/pdf", "size": 1048576, "url": "https://..." }
  ],
  "errors": []
}
```

### Get Submission Files

```
GET /api/files?submission=<submissionId>
```

### Upload Media

```
POST /api/media/upload
Content-Type: multipart/form-data
```

---

## Certificates

```
GET  /api/certificates              — List certificates
GET  /api/certificates/me           — User's certificates
POST /api/certificates/generate     — Generate certificate
GET  /api/certificates/verify       — Verify authenticity
```

### Admin

```
GET/POST   /api/admin/certificates                    — Manage certificates
GET/POST   /api/admin/certificates/templates          — Manage templates
GET/PUT/DELETE /api/admin/certificates/templates/:id  — Template CRUD
POST       /api/admin/certificates/templates/preview  — Preview
```

---

## AI Features

### Chat

```
GET /api/ai/chat   — List conversations
```

```
POST /api/ai/chat
```

```json
{
  "message": "Explain photosynthesis",
  "conversationId": "uuid-or-null",
  "context": { "courseId": "uuid", "lessonId": "uuid" },
  "currentPage": "/course/uuid/lesson/uuid"
}
```

```json
{
  "response": "Photosynthesis is...",
  "conversationId": "uuid",
  "usage": { "tokens": 450, "estimatedCost": 0.002 }
}
```

### Conversations

```
GET/PUT/DELETE /api/ai/conversations/:id
```

### AI Generation

```
POST /api/ai/quiz-generate         — Generate quiz from content
POST /api/ai/assignment-generate   — Generate assignment
POST /api/ai/rubric-generate       — Generate rubric
POST /api/ai/survey-generate       — Generate survey
POST /api/ai/insights              — Generate insights
GET  /api/ai/usage                 — Usage statistics
```

### AI Tutor

```
POST    /api/ai/tutor/chat          — Tutor chat
GET     /api/ai/tutor/analytics     — Tutor analytics
GET     /api/ai/tutor/context       — Tutor context
GET/PUT /api/ai/tutor/preferences   — Tutor preferences
```

---

## Conferences

### Get Conference

```
GET /api/conferences/:id
```

```json
{
  "conference": {
    "id": "uuid",
    "title": "Biology Lab Session",
    "scheduled_at": "2026-02-15T14:00:00Z",
    "duration_minutes": 60,
    "status": "scheduled",
    "instructor": { "id": "uuid", "name": "Dr. Smith" },
    "course": { "id": "uuid", "title": "Biology 101" },
    "participants": []
  }
}
```

### Update Conference

```
PUT /api/conferences/:id
```

**Auth:** Required — conference instructor or admin

```json
{
  "title": "Updated Title",
  "scheduled_at": "2026-02-15T15:00:00Z",
  "duration_minutes": 90,
  "max_participants": 30,
  "recording_enabled": true,
  "waiting_room_enabled": false
}
```

### Other

```
DELETE /api/conferences/:id         — Delete
POST  /api/conferences/:id/leave    — Leave
POST  /api/conferences/join-bbb     — Join BigBlueButton
```

---

## Gamification

```
POST /api/gamification/events    — Log event
GET  /api/gamification/profile   — XP, level, badges
POST /api/badges/issue           — Issue badge
GET  /api/badges/verify          — Verify badge
```

---

## LTI Integration

### LTI 1.3

```
POST /api/lti/launch             — LTI launch
POST /api/lti/oidc-login         — OIDC login
POST /api/lti/token              — Generate token
GET  /api/lti/jwks               — JWKS (public keys)
POST /api/lti/grade-passback     — Grade passback
GET  /api/lti/platform-info      — Platform info
```

### Admin

```
GET/POST /api/admin/lti-platforms   — LTI platforms
GET/POST /api/admin/lti-tools       — LTI tools
```

---

## SCORM

```
GET/POST /api/scorm/package    — SCORM packages
POST     /api/scorm/upload     — Upload package
POST     /api/scorm/runtime    — Track CMI data
```

---

## Search

```
GET /api/search?q=<term>
```

Searches across courses, lessons, and assignments.

---

## Student Features

### Bookmarks

```
GET /api/student/bookmarks?type=lesson&folder=Biology
```

```json
{
  "bookmarks": [
    {
      "id": "uuid",
      "bookmark_type": "lesson",
      "bookmark_id": "uuid",
      "folder": "Biology",
      "notes": "Review before exam",
      "created_at": "2026-02-10T10:00:00Z"
    }
  ],
  "folders": ["Biology", "Math"]
}
```

```
POST /api/student/bookmarks
```

```json
{
  "bookmark_type": "lesson",
  "bookmark_id": "uuid",
  "folder": "Biology",
  "notes": "Important topic",
  "toggle": true
}
```

### Other Student Endpoints

```
GET       /api/student/grades             — Grades by course
GET/POST  /api/student/study-groups       — Study groups
POST      /api/student/study-groups/join  — Join group
GET/POST  /api/student/notes              — Notes
GET/POST  /api/student/todos              — Todos
POST      /api/student/todos/sync         — Calendar sync
GET       /api/student/calendar           — Calendar events
GET       /api/student/programmes         — Enrolled programmes
```

---

## Programmes & Learning Paths

```
GET/POST /api/programmes       — Programmes
GET/POST /api/learning-paths   — Learning paths
```

---

## OneRoster

Standards-compliant OneRoster 1.1 for SIS integration:

```
GET /api/oneroster/classes       — Classes
GET /api/oneroster/enrollments   — Enrollments
GET /api/oneroster/users         — Users
GET /api/oneroster/orgs          — Organizations
```

---

## Admin Settings

```
GET/POST /api/admin/settings/editor          — Editor config
GET/POST /api/admin/settings/branding        — Branding
POST     /api/admin/settings/resource-upload — Upload resource
POST     /api/admin/upload/branding          — Branding assets
GET/POST /api/admin/proctoring-services      — Proctoring config
```

---

## Cron / Scheduled Tasks

Designed for Vercel Cron or external schedulers:

```
POST /api/cron/assignment-reminders   — Send due date reminders
POST /api/cron/email-digests          — Send notification digests
POST /api/cron/check-completions      — Process course completions
```

---

## Utility

```
GET  /api/health    — Health check (200 if healthy)
POST /api/contact   — Contact form submission
```

---

## Content Block Types

Lessons use a block-based content system. Each block has `type`, `title`, and `data`:

| Type | Data Format | Description |
|------|-------------|-------------|
| `text` | `"<p>HTML</p>"` or `{ "html": "<p>HTML</p>" }` | Rich text |
| `video` | `{ "url": "https://youtube.com/..." }` | Video embed |
| `slideshow` | `{ "url": "https://docs.google.com/..." }` | Slideshow |
| `embed` | `{ "url": "https://..." }` | Generic iframe |
| `file` | `{ "fileId": "uuid" }` | File download |
| `image` | `{ "url": "https://...", "alt": "..." }` | Image |
| `quiz` | `{ "quizId": "uuid", "points": 100 }` | Embedded quiz |
| `assignment` | `{ "assignmentId": "uuid" }` | Embedded assignment |
| `label` | `{ "text": "Title", "style": "heading", "size": "medium" }` | Label/divider |
| `code_sandbox` | `{ "language": "js", "code": "", "instructions": "" }` | Code editor |
| `pdf` | `{ "url": "https://..." }` | PDF viewer |
| `audio` | `{ "url": "https://..." }` | Audio player |

Label styles: `heading`, `divider`, `section`, `banner`

---

*Last updated: February 2026*
