-- ============================================================================
-- 020: SCORM to Lesson Progress Sync Trigger
-- Automatically updates lesson_progress when a student completes SCORM content.
-- Fires on INSERT or UPDATE to scorm_tracking.
-- ============================================================================

-- Function: sync SCORM completion status to lesson_progress
CREATE OR REPLACE FUNCTION sync_scorm_to_lesson_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_lesson_id UUID;
  v_course_id UUID;
  v_tenant_id UUID;
  v_is_completed BOOLEAN;
BEGIN
  -- Get the lesson_id and course_id from the scorm_package
  SELECT sp.lesson_id, sp.course_id, sp.tenant_id
    INTO v_lesson_id, v_course_id, v_tenant_id
    FROM public.scorm_packages sp
   WHERE sp.id = NEW.scorm_package_id;

  -- If no lesson linked, nothing to sync
  IF v_lesson_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine if SCORM reports completion
  -- SCORM 1.2: 'completed' or 'passed'
  -- SCORM 2004: 'completed' (completion_status) + optionally 'passed' (success_status)
  v_is_completed := (
    NEW.completion_status IN ('completed', 'passed') OR
    NEW.success_status = 'passed'
  );

  -- Upsert lesson_progress
  INSERT INTO public.lesson_progress (
    tenant_id,
    student_id,
    lesson_id,
    status,
    progress_percentage,
    started_at,
    completed_at,
    last_accessed_at,
    time_spent,
    updated_at
  ) VALUES (
    v_tenant_id,
    NEW.student_id,
    v_lesson_id,
    CASE WHEN v_is_completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN v_is_completed THEN 100
         WHEN NEW.progress_measure IS NOT NULL THEN ROUND(NEW.progress_measure * 100)
         ELSE 0
    END,
    COALESCE(NEW.first_accessed, NOW()),
    CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
    NOW(),
    COALESCE(NEW.time_spent, 0),
    NOW()
  )
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET
    status = CASE
      -- Never downgrade from completed
      WHEN lesson_progress.status = 'completed' THEN 'completed'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      ELSE 'in_progress'
    END,
    progress_percentage = GREATEST(lesson_progress.progress_percentage, EXCLUDED.progress_percentage),
    completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
    last_accessed_at = NOW(),
    time_spent = GREATEST(COALESCE(lesson_progress.time_spent, 0), COALESCE(EXCLUDED.time_spent, 0)),
    updated_at = NOW();

  -- Also update course_progress if course_id is available
  IF v_course_id IS NOT NULL THEN
    -- Count completed lessons for this student in this course
    DECLARE
      v_total_lessons INTEGER;
      v_completed_lessons INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_total_lessons
        FROM public.lessons
       WHERE course_id = v_course_id AND published = true;

      SELECT COUNT(*) INTO v_completed_lessons
        FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id
       WHERE l.course_id = v_course_id
         AND lp.student_id = NEW.student_id
         AND lp.status = 'completed';

      -- Update or create course enrollment progress
      UPDATE public.enrollments
         SET progress = CASE WHEN v_total_lessons > 0
               THEN ROUND((v_completed_lessons::NUMERIC / v_total_lessons) * 100)
               ELSE 0
             END,
             updated_at = NOW()
       WHERE student_id = NEW.student_id
         AND course_id = v_course_id;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after INSERT or UPDATE on scorm_tracking
DROP TRIGGER IF EXISTS trg_sync_scorm_to_lesson_progress ON public.scorm_tracking;
CREATE TRIGGER trg_sync_scorm_to_lesson_progress
  AFTER INSERT OR UPDATE ON public.scorm_tracking
  FOR EACH ROW
  EXECUTE FUNCTION sync_scorm_to_lesson_progress();
