-- ============================================================================
-- Part 36: Course cascade delete — move the cascade into the database
-- ============================================================================
-- Depends on: 001 .. 035
-- ============================================================================
-- Replaces the manual cascade in lib/services/course-service.ts
-- (Architectural Issue #8). A course has ~30 descendant tables; doing the
-- cleanup in application code was both racy (Promise.allSettled loses the
-- child-before-parent order), incomplete (new tables regularly get missed),
-- and silent on failure (rejections swallowed).
--
-- Two classes of change:
--
--   1. Direct FKs on courses(id) — set each to CASCADE (course-scoped
--      data that should vanish with the course) or SET NULL (historical
--      data we want to preserve but unlink).
--
--   2. Grand-child FKs that would otherwise block a parent's cascade
--      (e.g. questions → quizzes, assignment_submissions → assignments,
--      discussion_replies → course_discussions). These tables have no
--      direct course_id of their own, so the only way they get removed
--      is by cascading from their parent.
--
-- After this migration, deleting a course is a single-row DELETE; the
-- service function in lib/services/course-service.ts collapses from
-- ~40 lines of hard-coded table names to one statement.
--
-- The DDL below is idempotent: each (table, column, referenced_table)
-- is resolved to the actual FK constraint name dynamically, dropped if
-- present, then re-created with the desired ON DELETE action. Running
-- the migration twice is a no-op.
-- ============================================================================

DO $mig$
DECLARE
  spec RECORD;
  v_constraint_name TEXT;
  v_new_name TEXT;
BEGIN
  FOR spec IN
    SELECT *
    FROM (VALUES
      -- ── Direct courses(id) FKs: CASCADE (delete with the course) ─────────
      ('subjects',                  'course_id',          'courses',             'CASCADE'),
      ('lessons',                   'course_id',          'courses',             'CASCADE'),
      ('course_instructors',        'course_id',          'courses',             'CASCADE'),
      ('classes',                   'course_id',          'courses',             'CASCADE'),
      ('enrollments',               'course_id',          'courses',             'CASCADE'),
      ('quizzes',                   'course_id',          'courses',             'CASCADE'),
      ('quiz_attempts',             'course_id',          'courses',             'CASCADE'),
      ('assignments',               'course_id',          'courses',             'CASCADE'),
      ('course_gradebook_settings', 'course_id',          'courses',             'CASCADE'),
      ('course_grade_items',        'course_id',          'courses',             'CASCADE'),
      ('course_grades',             'course_id',          'courses',             'CASCADE'),
      ('course_discussions',        'course_id',          'courses',             'CASCADE'),
      ('discussions',               'course_id',          'courses',             'CASCADE'),
      ('lesson_discussions',        'course_id',          'courses',             'CASCADE'),
      ('course_announcements',      'course_id',          'courses',             'CASCADE'),
      ('resource_links',            'course_id',          'courses',             'CASCADE'),
      ('scorm_packages',            'course_id',          'courses',             'CASCADE'),
      ('scorm_tracking',            'course_id',          'courses',             'CASCADE'),
      ('video_conferences',         'course_id',          'courses',             'CASCADE'),
      ('user_badges',               'course_id',          'courses',             'CASCADE'),
      ('certificates',              'course_id',          'courses',             'CASCADE'),
      ('ceu_credits',               'course_id',          'courses',             'CASCADE'),
      ('ai_tutor_conversations',    'course_id',          'courses',             'CASCADE'),
      ('ai_tutor_analytics',        'course_id',          'courses',             'CASCADE'),
      ('student_activity_log',      'course_id',          'courses',             'CASCADE'),
      ('gamification_xp_ledger',    'course_id',          'courses',             'CASCADE'),

      -- ── Direct courses(id) FKs: SET NULL (preserve row, unlink) ──────────
      -- files.course_id: uploaded assets outlive the course (other lessons
      -- or standalone references may still need the URL resolvable).
      ('files',                     'course_id',          'courses',             'SET NULL'),

      -- ── Grand-child FKs: propagate from parents now scheduled for cascade ─
      -- quizzes → questions, quiz_attempts
      ('questions',                 'quiz_id',            'quizzes',             'CASCADE'),
      ('quiz_attempts',             'quiz_id',            'quizzes',             'CASCADE'),

      -- assignments → assignment_submissions
      ('assignment_submissions',    'assignment_id',      'assignments',         'CASCADE'),

      -- course_discussions → replies, votes; self-ref on replies
      ('discussion_replies',        'discussion_id',      'course_discussions',  'CASCADE'),
      ('discussion_replies',        'parent_reply_id',    'discussion_replies',  'CASCADE'),
      ('discussion_votes',          'discussion_id',      'course_discussions',  'CASCADE'),
      ('discussion_votes',          'reply_id',           'discussion_replies',  'CASCADE'),

      -- lesson_discussions → replies, votes; self-ref on replies
      ('lesson_discussion_replies', 'discussion_id',      'lesson_discussions',        'CASCADE'),
      ('lesson_discussion_replies', 'parent_reply_id',    'lesson_discussion_replies', 'CASCADE'),
      ('lesson_discussion_votes',   'discussion_id',      'lesson_discussions',        'CASCADE'),
      ('lesson_discussion_votes',   'reply_id',           'lesson_discussion_replies', 'CASCADE'),

      -- course_announcements → announcement_views
      ('announcement_views',        'announcement_id',    'course_announcements','CASCADE'),

      -- classes → instructors, students, enrollments.class_id, attendance, grade_items, grades
      ('class_instructors',         'class_id',           'classes',             'CASCADE'),
      ('class_students',            'class_id',           'classes',             'CASCADE'),
      ('enrollments',               'class_id',           'classes',             'CASCADE'),
      ('attendance',                'class_id',           'classes',             'CASCADE'),
      ('grade_items',               'class_id',           'classes',             'CASCADE'),
      ('grades',                    'class_id',           'classes',             'CASCADE'),

      -- class-level grade_items → grades (secondary cascade path; safe either way)
      ('grades',                    'grade_item_id',      'grade_items',         'CASCADE'),

      -- video_conferences → participants, recordings
      ('conference_participants',   'conference_id',      'video_conferences',   'CASCADE'),
      ('conference_recordings',     'conference_id',      'video_conferences',   'CASCADE'),

      -- scorm_packages → scorm_tracking
      ('scorm_tracking',            'scorm_package_id',   'scorm_packages',      'CASCADE'),

      -- lessons → lesson_progress, progress (content_item_progress already CASCADE)
      ('lesson_progress',           'lesson_id',          'lessons',             'CASCADE'),
      ('progress',                  'lesson_id',          'lessons',             'CASCADE')
    ) AS v(tbl, col, ref_tbl, action)
  LOOP
    -- Skip gracefully if the table or column isn't present in this environment.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = spec.tbl
    ) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = spec.tbl AND column_name = spec.col
    ) THEN
      CONTINUE;
    END IF;

    -- Find the existing FK regardless of its name.
    v_constraint_name := NULL;
    SELECT tc.constraint_name INTO v_constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema = 'public'
      AND tc.table_name = spec.tbl
      AND kcu.column_name = spec.col
      AND ccu.table_name = spec.ref_tbl
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',
                     spec.tbl, v_constraint_name);
    END IF;

    v_new_name := spec.tbl || '_' || spec.col || '_fkey';
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
      spec.tbl, v_new_name, spec.col, spec.ref_tbl, spec.action
    );
  END LOOP;
END
$mig$;
