-- ============================================================================
-- Migration 056: Composite indexes for tenant-filtered RLS queries
-- ============================================================================
-- The app's RLS policies and TenantFilteredQuery helper add `tenant_id = ?`
-- to almost every read. Without composite indexes leading with tenant_id,
-- Postgres falls back to scanning single-column indexes and then filtering
-- — fine at 100 students, painful at 10k.
--
-- This migration also adds single-column indexes for foreign keys that
-- currently have none (Postgres does not auto-index FKs; missing ones
-- cause slow cascades on delete and slow lookups by referencing column).
--
-- APPLICATION NOTE: CREATE INDEX CONCURRENTLY cannot run inside a
-- transaction block. Apply each statement individually in the Supabase
-- SQL editor, OR run via psql with `--single-transaction` disabled
-- (the default). Do NOT wrap this file in BEGIN/COMMIT.
-- ============================================================================

-- enrollments: many reads of "all students in course X"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_tenant_course
  ON enrollments(tenant_id, course_id);

-- quiz_attempts: gradebook + student progress dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_tenant_student
  ON quiz_attempts(tenant_id, student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_tenant_quiz
  ON quiz_attempts(tenant_id, quiz_id);

-- assignment_submissions: instructor's "all submissions" view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignment_submissions_tenant_assignment
  ON assignment_submissions(tenant_id, assignment_id);

-- course_grades: bulk gradebook reads per course
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_grades_tenant_course
  ON course_grades(tenant_id, course_id);

-- course_instructors: "who teaches this course?" + RBAC checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_instructors_tenant_course
  ON course_instructors(tenant_id, course_id);

-- classes: most course pages list classes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_tenant_course
  ON classes(tenant_id, course_id);

-- student_chat_messages: per-user message history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_chat_messages_tenant_sender
  ON student_chat_messages(tenant_id, sender_id, created_at DESC);

-- student_activity_log: per-student timeline + per-course analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_activity_log_tenant_student
  ON student_activity_log(tenant_id, student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_activity_log_tenant_course
  ON student_activity_log(tenant_id, course_id, created_at DESC);

-- course_announcements: timeline reads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_announcements_tenant_course_date
  ON course_announcements(tenant_id, course_id, created_at DESC);

-- tenant_memberships: every authenticated request hits this for tenant resolution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_memberships_tenant_user
  ON tenant_memberships(tenant_id, user_id);

-- users: tenant-scoped email lookups (signin / invite flows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_email
  ON users(tenant_id, email);

-- discussion replies: thread reads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussion_replies_tenant_discussion
  ON discussion_replies(tenant_id, discussion_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_discussion_replies_tenant_discussion
  ON lesson_discussion_replies(tenant_id, discussion_id);

-- Foreign keys with no covering index (slow deletes / reverse lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_chat_members_user
  ON student_chat_members(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_chat_rooms_created_by
  ON student_chat_rooms(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_review_assignments_reviewer
  ON peer_review_assignments(reviewer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_creator
  ON assignments(creator_id);
