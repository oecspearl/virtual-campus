-- Migration 022: Add missing unique constraints for data integrity under concurrent access
-- These prevent duplicate records caused by race conditions (check-then-insert patterns)

-- 1. Prevent duplicate assignment submissions per student
-- Without this, double-clicks or network retries create duplicate submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_submissions_assignment_student_unique'
  ) THEN
    -- Remove any existing duplicates first (keep the most recent one)
    DELETE FROM assignment_submissions a
    USING assignment_submissions b
    WHERE a.assignment_id = b.assignment_id
      AND a.student_id = b.student_id
      AND a.created_at < b.created_at;

    ALTER TABLE assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_student_unique
    UNIQUE (assignment_id, student_id);
  END IF;
END $$;

-- 2. Prevent duplicate gradebook items for the same assessment
-- Without this, concurrent quiz submissions create duplicate grade items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_grade_items_course_type_assessment_unique'
  ) THEN
    -- Remove any existing duplicates first (keep the one with the lowest id)
    DELETE FROM course_grade_items a
    USING course_grade_items b
    WHERE a.course_id = b.course_id
      AND a.type = b.type
      AND a.assessment_id = b.assessment_id
      AND a.id > b.id;

    ALTER TABLE course_grade_items
    ADD CONSTRAINT course_grade_items_course_type_assessment_unique
    UNIQUE (course_id, type, assessment_id);
  END IF;
END $$;

-- 3. Prevent duplicate discussion votes per user per target
-- Without this, rapid clicking inflates vote counts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_votes_user_discussion_unique'
  ) THEN
    -- Remove duplicate discussion votes (keep the earliest)
    DELETE FROM discussion_votes a
    USING discussion_votes b
    WHERE a.user_id = b.user_id
      AND a.discussion_id = b.discussion_id
      AND a.discussion_id IS NOT NULL
      AND a.created_at > b.created_at;

    ALTER TABLE discussion_votes
    ADD CONSTRAINT discussion_votes_user_discussion_unique
    UNIQUE (user_id, discussion_id);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add discussion_votes_user_discussion_unique: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discussion_votes_user_reply_unique'
  ) THEN
    -- Remove duplicate reply votes (keep the earliest)
    DELETE FROM discussion_votes a
    USING discussion_votes b
    WHERE a.user_id = b.user_id
      AND a.reply_id = b.reply_id
      AND a.reply_id IS NOT NULL
      AND a.created_at > b.created_at;

    ALTER TABLE discussion_votes
    ADD CONSTRAINT discussion_votes_user_reply_unique
    UNIQUE (user_id, reply_id);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add discussion_votes_user_reply_unique: %', SQLERRM;
END $$;

-- 4. Add performance indexes for common query patterns found missing
CREATE INDEX IF NOT EXISTS idx_course_instructors_course_instructor
  ON course_instructors (course_id, instructor_id);

CREATE INDEX IF NOT EXISTS idx_course_grade_items_course_type_assessment
  ON course_grade_items (course_id, type, assessment_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_read
  ON in_app_notifications (user_id, is_read);
