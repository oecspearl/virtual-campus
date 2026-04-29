# Virtual Campus — User Stories

Each story follows the format **"As a `<role>`, I want `<goal>` so that `<benefit>`"** with Given/When/Then acceptance criteria. Stories are grouped by role.

Roles in this platform: `super_admin` > `tenant_admin` > `admin` > `instructor` > `curriculum_designer` > `student` > `parent`.

---

## Student

### S-1. Browse and enroll in courses
**As a** student, **I want to** browse the course catalog and self-enroll **so that** I can start learning at my own pace.

- **Given** I am authenticated as a student, **when** I open `/courses`, **then** I see only courses my tenant has published.
- **Given** I view a course, **when** I click "Enroll", **then** an `enrollments` row is created and I am redirected to the course home.
- **Given** a course requires approval, **when** I enroll, **then** my status is `pending` until an admin approves.
- **Given** I am already enrolled, **when** I revisit the course, **then** the button reads "Continue learning".

### S-2. Resume a lesson where I left off
**As a** student, **I want** the platform to remember my last position in a lesson **so that** I don't lose progress.

- **Given** I'm watching a video lesson, **when** I leave the page, **then** my timestamp is persisted at most every 10s.
- **Given** I return to a lesson, **when** it loads, **then** playback resumes within 2s of my last position.
- **Given** I complete a lesson, **when** I revisit it, **then** it is marked complete and progress isn't reset.

### S-3. Submit assignments and view grades
**As a** student, **I want to** submit assignments and see my grade and feedback **so that** I know how I'm performing.

- **Given** an open assignment, **when** I upload a file under the size/type limit, **then** the submission is recorded with a timestamp.
- **Given** the deadline has passed, **when** I attempt to submit, **then** submission is blocked unless late submissions are allowed.
- **Given** my work has been graded, **when** I open the assignment, **then** I see the score, rubric breakdown, and instructor comments.

### S-4. Take a timed quiz
**As a** student, **I want to** take quizzes with a visible timer **so that** the assessment reflects real conditions.

- **Given** a quiz with a 30-min limit, **when** I start, **then** the server records a start time and counts down on the client.
- **Given** time expires, **when** the timer hits 0, **then** answers auto-submit and no further changes are accepted.
- **Given** I lose connectivity mid-quiz, **when** I reconnect, **then** my remaining time is computed server-side, not from the client clock.

### S-5. Earn badges and track progress
**As a** student, **I want to** earn badges and see my progress **so that** I stay motivated.

- **Given** I complete a course, **when** the system runs achievement checks, **then** the matching badge is awarded once (idempotent).
- **Given** I open my profile, **when** the page renders, **then** I see badges, total XP, and a progress bar per active course.

### S-6. Download transcript / certificate
**As a** student, **I want to** download a transcript or certificate **so that** I can share my achievements.

- **Given** I have completed a course, **when** I request a certificate, **then** a PDF is generated with my legal name, course title, completion date, and a verification ID.
- **Given** my transcript is requested, **when** generation completes, **then** all completed courses, grades, and credits are listed in a tamper-evident PDF.
- **Given** a certificate's verification ID is queried publicly, **when** valid, **then** the holder's name and course are returned.

### S-7. Discuss lessons with classmates
**As a** student, **I want to** discuss lessons with classmates **so that** I can learn collaboratively.

- **Given** I am enrolled in a course, **when** I open a lesson, **then** I see only the discussion thread for that lesson and course.
- **Given** I post a reply, **when** it is saved, **then** it is visible to other enrolled students within 2s.
- **Given** a post violates moderation rules, **when** an instructor hides it, **then** it is no longer visible to students.

### S-8. Request credit transfer
**As a** student, **I want to** request credit transfer from a prior institution **so that** I don't repeat work.

- **Given** I submit a transfer request with supporting documents, **when** saved, **then** a `credit_records` row is created in `pending` status.
- **Given** an admin approves the request, **when** the transition is recorded, **then** credits appear on my transcript and I am emailed using the credit-transfer template.
- **Given** the request is rejected, **when** I view it, **then** I see the reason and can re-submit with new evidence.

---

## Instructor

### I-1. Create courses with topics or weekly format
**As an** instructor, **I want to** create courses structured as topics or weekly schedules **so that** I can deliver content the way that fits my subject.

- **Given** I create a new course, **when** I choose "weekly", **then** sections are auto-created per week between start and end dates.
- **Given** I choose "topics", **when** I save, **then** I can add/rename topic sections freely.
- **Given** I switch format on a course with content, **when** I confirm, **then** existing lessons are mapped or I am warned about loss.

### I-2. Drag-and-drop reorder lessons and sections
**As an** instructor, **I want to** reorder lessons and sections by drag-and-drop **so that** I can restructure courses without editing each item.

- **Given** I drag a lesson within a section, **when** I drop it, **then** its `order_index` is persisted and the new order survives a reload.
- **Given** I drag a section, **when** I drop it, **then** all child lessons move with it.
- **Given** the save fails, **when** the API returns an error, **then** the UI rolls back to the prior order and surfaces the real error message.

### I-3. Upload media with captions
**As an** instructor, **I want to** upload videos, PDFs, and caption files **so that** my lessons are accessible and rich.

- **Given** I upload a `.mp4`, `.pdf`, `.vtt`, or `.srt`, **when** the upload completes, **then** the file is stored and linked to the lesson.
- **Given** I upload an unsupported type, **when** the request hits `/api/media/upload`, **then** I get a 400 with a clear error.
- **Given** the file's MIME is `octet-stream`, **when** the extension is recognized, **then** the upload still succeeds via the extension fallback.

### I-4. Build quizzes from a question bank
**As an** instructor, **I want to** assemble quizzes from a question bank **so that** I can reuse questions across courses.

- **Given** I select questions from a bank, **when** I save the quiz, **then** quiz items reference questions by ID (not by copy).
- **Given** I edit a banked question later, **when** I save, **then** all quizzes referencing it reflect the change unless explicitly snapshotted.
- **Given** I want randomized delivery, **when** I configure "pick N from pool", **then** each student gets a different sample.

### I-5. Grade assignments with rubric and feedback
**As an** instructor, **I want to** grade with a rubric and inline comments **so that** students get actionable feedback.

- **Given** an assignment has a rubric, **when** I grade, **then** the total score equals the sum of rubric criterion scores.
- **Given** I leave inline comments, **when** I submit the grade, **then** the student is notified once (no duplicate emails).
- **Given** I save a draft grade, **when** I leave the page, **then** my draft is preserved and not visible to the student.

### I-6. Lesson-level analytics
**As an** instructor, **I want to** see lesson-level analytics **so that** I can identify where students get stuck.

- **Given** I open course analytics, **when** the page loads, **then** I see completion rate, average time, and drop-off point per lesson.
- **Given** fewer than 5 students have data, **when** the chart renders, **then** I see an "insufficient data" notice instead of misleading numbers.

### I-7. Enable proctoring for an exam
**As an** instructor, **I want to** enable proctoring for high-stakes exams **so that** I can deter cheating.

- **Given** I enable proctoring on a quiz, **when** a student starts, **then** webcam + screen recording consent is required before the timer begins.
- **Given** suspicious events occur (face lost, tab switch), **when** the proctor reviews, **then** events are timestamped and replayable.
- **Given** a student declines consent, **when** they try to start, **then** they are blocked and shown an alternate-arrangement contact.

---

## Curriculum Designer

### CD-1. Define learning paths and competencies
**As a** curriculum designer, **I want to** define learning paths and competencies **so that** courses ladder into a coherent programme.

- **Given** I create a learning path, **when** I add courses with prerequisites, **then** the system rejects cycles.
- **Given** a competency is mapped to multiple courses, **when** a student completes any one, **then** the competency is marked attained.

### CD-2. Import SCORM / LTI content
**As a** curriculum designer, **I want to** import SCORM packages and add LTI tools **so that** we can reuse industry-standard content.

- **Given** I upload a valid SCORM 1.2 or 2004 package, **when** import completes, **then** it appears as a launchable lesson.
- **Given** I configure an LTI 1.3 tool, **when** a student launches it, **then** grade passback writes back to the gradebook.

### CD-3. OneRoster mapping
**As a** curriculum designer, **I want to** map courses to OneRoster classes **so that** we stay interoperable with district systems.

- **Given** OneRoster sync runs, **when** classes/users change upstream, **then** local enrollments reconcile without manual intervention.
- **Given** a sync conflict, **when** detected, **then** it is logged with enough detail to resolve manually.

---

## Parent

### P-1. View child's grades and attendance
**As a** parent, **I want to** view my child's grades and attendance **so that** I can support their learning.

- **Given** I am linked to a student, **when** I open the dashboard, **then** I see only that child's grades, attendance, and announcements.
- **Given** I have multiple children, **when** I switch the selector, **then** the dashboard updates to that child's data only.

### P-2. Receive notifications
**As a** parent, **I want to** receive notifications for missed assignments and announcements **so that** I don't have to log in to check.

- **Given** an assignment is overdue, **when** the nightly job runs, **then** I get one email per child per day (digest, not per item).
- **Given** I unsubscribe, **when** I confirm, **then** no further marketing/announcement emails are sent (transactional still allowed).

---

## Admin

### A-1. Admissions pipeline
**As an** admin, **I want to** manage applicants through stages **so that** I can move them to enrolled students.

- **Given** an applicant submits, **when** saved, **then** their status is `submitted` and reviewers are notified.
- **Given** I move an applicant to `accepted`, **when** I confirm, **then** a student account is provisioned and an enrollment offer email is sent.

### A-2. Assign roles
**As an** admin, **I want to** assign roles to users **so that** the right people get the right access.

- **Given** I edit a user, **when** I change their role, **then** an audit log entry is written with actor, target, before, after.
- **Given** I try to grant `super_admin`, **when** I am not super_admin myself, **then** the action is blocked at the API.

### A-3. Reports
**As an** admin, **I want to** generate enrollment and completion reports **so that** leadership has institution-wide visibility.

- **Given** I request a report, **when** it generates, **then** results are scoped to my tenant only.
- **Given** the report exceeds 10k rows, **when** I export, **then** I get an async job + download link rather than a synchronous timeout.

### A-4. Issue certificates on completion
**As an** admin, **I want** certificates issued automatically on course completion **so that** credentialing isn't manual.

- **Given** a student crosses the completion threshold, **when** the trigger runs, **then** exactly one certificate is issued (idempotent).
- **Given** a certificate template changes, **when** I regenerate, **then** old certificates retain their original verification ID.

---

## Tenant Admin

### TA-1. Custom branding
**As a** tenant admin, **I want to** customize logo, colors, and custom domain **so that** the platform feels like our institution.

- **Given** I update branding, **when** I save, **then** changes appear within 60s (cache TTL).
- **Given** I add a custom domain, **when** DNS verification passes, **then** requests to that hostname resolve to my tenant.

### TA-2. SSO / OIDC per tenant
**As a** tenant admin, **I want to** configure SSO for my tenant **so that** users sign in with our existing IdP.

- **Given** I configure OIDC client + secret, **when** a user authenticates via IdP, **then** they are auto-provisioned into my tenant only.
- **Given** SSO is required, **when** a user attempts password login, **then** they are redirected to the IdP.

### TA-3. Manage users and seat limits
**As a** tenant admin, **I want to** manage users within my tenant **so that** I control access.

- **Given** my tenant's seat limit is reached, **when** I try to add a user, **then** the action is blocked with a clear message.
- **Given** I deactivate a user, **when** they next request a page, **then** they are signed out and shown an account-disabled message.

### TA-4. Cross-tenant course sharing
**As a** tenant admin, **I want to** share courses across partner tenants **so that** we can offer joint programmes.

- **Given** I publish a course as shareable, **when** a partner tenant accepts, **then** their students can enroll while content stays read-only to them.
- **Given** I revoke sharing, **when** confirmed, **then** existing enrollments are preserved but no new ones are allowed.

---

## Super Admin

### SA-1. Provision and suspend tenants
**As a** super admin, **I want to** provision and suspend tenants **so that** I can onboard institutions and enforce billing.

- **Given** I create a tenant, **when** saved, **then** a default subdomain, admin user, and seed settings are created.
- **Given** I suspend a tenant, **when** any user from that tenant requests a page, **then** they see a suspension notice (enforced by `lib/api-auth-tenant.ts`).

### SA-2. Cross-tenant health and usage
**As a** super admin, **I want to** monitor platform-wide health and usage **so that** I can plan capacity.

- **Given** I open the platform dashboard, **when** it loads, **then** I see active tenants, MAU per tenant, and error rate trend.

### SA-3. Safe data migrations
**As a** super admin, **I want to** run data migrations safely **so that** tenants aren't impacted.

- **Given** a migration is queued, **when** it runs, **then** it executes in batches with progress logged and is idempotent on re-run.
- **Given** a migration fails partway, **when** it retries, **then** already-processed records are skipped.

---

## Cross-cutting / Non-functional

### NF-1. Offline read-only access
**As any** user, **I want** read-only content to work offline **so that** I can study without connectivity.

- **Given** I previously loaded a lesson, **when** I go offline, **then** the lesson text and downloaded media still render.
- **Given** I attempt a write action offline, **when** I submit, **then** I see a clear "offline — changes not saved" notice.

### NF-2. Accessibility (WCAG 2.1 AA)
**As any** user, **I want** the platform to meet WCAG 2.1 AA **so that** screen readers and keyboard users can succeed.

- **Given** I tab through a page, **when** focus moves, **then** every interactive element has a visible focus indicator.
- **Given** I use a screen reader, **when** I navigate a course page, **then** headings, landmarks, and form labels are announced correctly.

### NF-3. Internationalization
**As any** user, **I want to** use the platform in my preferred language **so that** I can learn comfortably.

- **Given** I select a language, **when** I reload, **then** all UI strings render in that language with no missing keys.
- **Given** a translation is missing, **when** rendered, **then** it falls back to English (not a raw key).
