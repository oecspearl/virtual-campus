-- ============================================================================
-- Performance Optimization: Strategic Database Indexes
-- ============================================================================
-- Purpose: Add indexes to improve query performance for frequently accessed data
-- Expected Impact: 50-70% reduction in query time for common operations
-- Estimated Execution Time: 5-10 minutes on production database
-- ============================================================================

-- ============================================================================
-- ENROLLMENTS TABLE INDEXES
-- ============================================================================
-- These indexes optimize student-course relationship queries

-- Index for student course lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course 
ON enrollments(student_id, course_id);

-- Index for active enrollments by course
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status 
ON enrollments(course_id, status) 
WHERE status = 'active';

-- Index for enrollment date queries and sorting
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at 
ON enrollments(enrolled_at DESC);

-- Index for student enrollments with status
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status 
ON enrollments(student_id, status);

-- ============================================================================
-- LESSON PROGRESS TABLE INDEXES
-- ============================================================================
-- These indexes optimize progress tracking queries

-- Composite index for student lesson progress lookups
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_lesson 
ON lesson_progress(student_id, lesson_id);

-- Index for lesson completion tracking
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_status 
ON lesson_progress(lesson_id, status);

-- Index for student progress by status
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_status 
ON lesson_progress(student_id, status);

-- Index for recently accessed lessons
CREATE INDEX IF NOT EXISTS idx_lesson_progress_last_accessed 
ON lesson_progress(student_id, last_accessed_at DESC);

-- ============================================================================
-- COURSES TABLE INDEXES
-- ============================================================================
-- These indexes optimize course discovery and filtering

-- Composite index for published and featured courses
CREATE INDEX IF NOT EXISTS idx_courses_published_featured 
ON courses(published, featured) 
WHERE published = true;

-- Index for subject area filtering
CREATE INDEX IF NOT EXISTS idx_courses_subject_published 
ON courses(subject_area, published) 
WHERE published = true;

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_courses_difficulty_published 
ON courses(difficulty, published) 
WHERE published = true;

-- Index for course creation date (for sorting)
CREATE INDEX IF NOT EXISTS idx_courses_created_at 
ON courses(created_at DESC);

-- ============================================================================
-- LESSONS TABLE INDEXES
-- ============================================================================
-- These indexes optimize lesson queries within courses

-- Composite index for course lessons with ordering
CREATE INDEX IF NOT EXISTS idx_lessons_course_published_order 
ON lessons(course_id, published, "order") 
WHERE published = true;

-- Index for subject lessons
CREATE INDEX IF NOT EXISTS idx_lessons_subject_order 
ON lessons(subject_id, "order");

-- Index for lesson type filtering
CREATE INDEX IF NOT EXISTS idx_lessons_course_content_type 
ON lessons(course_id, content_type);

-- ============================================================================
-- QUIZ ATTEMPTS TABLE INDEXES
-- ============================================================================
-- These indexes optimize quiz history and grading queries

-- Composite index for student quiz attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz 
ON quiz_attempts(student_id, quiz_id, submitted_at DESC);

-- Index for quiz grading queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_status 
ON quiz_attempts(quiz_id, status);

-- Index for course quiz attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_student 
ON quiz_attempts(course_id, student_id);

-- Index for recent attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at 
ON quiz_attempts(submitted_at DESC) 
WHERE status = 'submitted' OR status = 'graded';

-- ============================================================================
-- QUIZZES TABLE INDEXES
-- ============================================================================
-- These indexes optimize quiz listing and filtering

-- Index for course quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_published 
ON quizzes(course_id, published) 
WHERE published = true;

-- Index for lesson quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson 
ON quizzes(lesson_id) 
WHERE lesson_id IS NOT NULL;

-- Index for quiz availability
CREATE INDEX IF NOT EXISTS idx_quizzes_availability 
ON quizzes(available_from, available_until) 
WHERE published = true;

-- ============================================================================
-- ASSIGNMENTS TABLE INDEXES
-- ============================================================================
-- These indexes optimize assignment queries

-- Index for course assignments with due dates
CREATE INDEX IF NOT EXISTS idx_assignments_course_due_date 
ON assignments(course_id, due_date) 
WHERE published = true;

-- Index for class assignments
CREATE INDEX IF NOT EXISTS idx_assignments_class_published 
ON assignments(class_id, published) 
WHERE published = true;

-- Index for upcoming assignments (removed CURRENT_TIMESTAMP as it's not immutable)
CREATE INDEX IF NOT EXISTS idx_assignments_due_date 
ON assignments(due_date ASC) 
WHERE published = true;

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE INDEXES
-- ============================================================================
-- These indexes optimize submission tracking and grading

-- Index for student submissions
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student 
ON assignment_submissions(student_id, submitted_at DESC);

-- Index for assignment grading
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status 
ON assignment_submissions(assignment_id, status);

-- Index for ungraded submissions
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_ungraded 
ON assignment_submissions(assignment_id, submitted_at ASC) 
WHERE status = 'submitted';

-- ============================================================================
-- COURSE GRADES TABLE INDEXES
-- ============================================================================
-- These indexes optimize gradebook queries

-- Composite index for student grades by course
CREATE INDEX IF NOT EXISTS idx_course_grades_student_course 
ON course_grades(student_id, course_id);

-- Index for grade item grades
CREATE INDEX IF NOT EXISTS idx_course_grades_grade_item 
ON course_grades(grade_item_id, student_id);

-- Index for course gradebook
CREATE INDEX IF NOT EXISTS idx_course_grades_course_student 
ON course_grades(course_id, student_id);

-- ============================================================================
-- DISCUSSIONS TABLE INDEXES
-- ============================================================================
-- These indexes optimize discussion queries

-- Index for course discussions
CREATE INDEX IF NOT EXISTS idx_course_discussions_course_created 
ON course_discussions(course_id, created_at DESC);

-- Index for lesson discussions
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson_created 
ON lesson_discussions(lesson_id, created_at DESC);

-- Index for discussion replies
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion 
ON discussion_replies(discussion_id, created_at ASC);

-- ============================================================================
-- GAMIFICATION TABLE INDEXES
-- ============================================================================
-- These indexes optimize gamification queries

-- Index for XP ledger by user
CREATE INDEX IF NOT EXISTS idx_gamification_xp_ledger_user 
ON gamification_xp_ledger(user_id, created_at DESC);

-- Index for course XP
CREATE INDEX IF NOT EXISTS idx_gamification_xp_ledger_course 
ON gamification_xp_ledger(course_id, user_id) 
WHERE course_id IS NOT NULL;

-- Index for event type tracking
CREATE INDEX IF NOT EXISTS idx_gamification_xp_ledger_event 
ON gamification_xp_ledger(event_type, created_at DESC);

-- ============================================================================
-- AI TABLES INDEXES
-- ============================================================================
-- These indexes optimize AI conversation queries

-- Index for user conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user 
ON ai_conversations(user_id, updated_at DESC);

-- Index for conversation messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation 
ON ai_messages(conversation_id, created_at ASC);

-- ============================================================================
-- ANALYTICS TABLE INDEXES
-- ============================================================================
-- These indexes optimize analytics queries

-- Index for student activity log
CREATE INDEX IF NOT EXISTS idx_student_activity_log_student 
ON student_activity_log(student_id, created_at DESC);

-- Index for course activity
CREATE INDEX IF NOT EXISTS idx_student_activity_log_course 
ON student_activity_log(course_id, created_at DESC);

-- Index for activity type
CREATE INDEX IF NOT EXISTS idx_student_activity_log_type 
ON student_activity_log(activity_type, created_at DESC);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Run this migration during low-traffic periods
-- 2. Monitor database performance after deployment
-- 3. Use EXPLAIN ANALYZE to verify index usage
-- 4. Indexes can be dropped if they don't improve performance
-- 5. Monitor index bloat and rebuild if necessary
--
-- To verify indexes were created, run this query separately:
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%' 
-- ORDER BY indexname;
-- ============================================================================
