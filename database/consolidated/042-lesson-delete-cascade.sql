-- ============================================================================
-- Part 42: Lesson delete — cascade FK references
-- ============================================================================
-- Depends on: 003, 004, 005 (lesson FK references)
-- ============================================================================
-- The instructor-facing lesson delete UI (added in commit c74af7a) hits
-- DELETE /api/lessons/:id, but several child tables FK back to lessons(id)
-- without an ON DELETE clause — so the delete fails with:
--
--   23503: update or delete on table "lessons" violates foreign key
--   constraint "<table>_lesson_id_fkey"
--
-- This migration drops and recreates each affected constraint with the
-- intended ON DELETE behavior:
--
--   CASCADE   — child row is meaningless without its lesson, drop it
--   SET NULL  — child row is an audit/historical record, keep it but
--               break the link
--
-- Tables already correct (do not touch): cohort_lessons (016),
-- video_comments (021), shared_course_lessons (014), discussion_replies on
-- lesson_discussions (already CASCADE), student_quiz_attempts (003:388),
-- learning paths (007), modules (008:14 SET NULL), whiteboards (017 SET
-- NULL), prerequisite_lesson_id (002 SET NULL).
-- ============================================================================

-- --- CASCADE: child rows are lesson-bound and become orphaned without it ---

ALTER TABLE public.quizzes
  DROP CONSTRAINT IF EXISTS quizzes_lesson_id_fkey,
  ADD CONSTRAINT quizzes_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_lesson_id_fkey,
  ADD CONSTRAINT assignments_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_lesson_id_fkey,
  ADD CONSTRAINT lesson_progress_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.progress
  DROP CONSTRAINT IF EXISTS progress_lesson_id_fkey,
  ADD CONSTRAINT progress_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_discussions
  DROP CONSTRAINT IF EXISTS lesson_discussions_lesson_id_fkey,
  ADD CONSTRAINT lesson_discussions_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_lesson_id_fkey,
  ADD CONSTRAINT files_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- The constraint that triggered the original 23503 error:
ALTER TABLE public.resource_links
  DROP CONSTRAINT IF EXISTS resource_links_lesson_id_fkey,
  ADD CONSTRAINT resource_links_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.scorm_packages
  DROP CONSTRAINT IF EXISTS scorm_packages_lesson_id_fkey,
  ADD CONSTRAINT scorm_packages_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.scorm_tracking
  DROP CONSTRAINT IF EXISTS scorm_tracking_lesson_id_fkey,
  ADD CONSTRAINT scorm_tracking_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.video_conferences
  DROP CONSTRAINT IF EXISTS video_conferences_lesson_id_fkey,
  ADD CONSTRAINT video_conferences_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.ai_tutor_conversations
  DROP CONSTRAINT IF EXISTS ai_tutor_conversations_lesson_id_fkey,
  ADD CONSTRAINT ai_tutor_conversations_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.ai_tutor_analytics
  DROP CONSTRAINT IF EXISTS ai_tutor_analytics_lesson_id_fkey,
  ADD CONSTRAINT ai_tutor_analytics_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- --- SET NULL: audit/historical record we want to keep ---

-- XP ledger entries are an audit trail; preserve the row, drop the link.
ALTER TABLE public.gamification_xp_ledger
  DROP CONSTRAINT IF EXISTS gamification_xp_ledger_lesson_id_fkey,
  ADD CONSTRAINT gamification_xp_ledger_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
