-- Migration: 009-add-enrollment-cleanup.sql
-- Automatically clean up student data when they are removed from a course
-- Run this migration after 008-add-content-item-progress.sql

-- ================================================================
-- CLEANUP FUNCTION
-- ================================================================

-- Function to clean up student data when dropped from a course
CREATE OR REPLACE FUNCTION cleanup_student_course_data(
    p_student_id UUID,
    p_course_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_todos_deleted INTEGER := 0;
    v_calendar_deleted INTEGER := 0;
    v_notes_deleted INTEGER := 0;
    v_bookmarks_deleted INTEGER := 0;
    v_lesson_ids UUID[];
    v_assignment_ids UUID[];
    v_quiz_ids UUID[];
BEGIN
    -- Get lesson IDs for this course
    SELECT ARRAY_AGG(id) INTO v_lesson_ids
    FROM lessons
    WHERE course_id = p_course_id;

    -- Get assignment IDs for this course
    SELECT ARRAY_AGG(id) INTO v_assignment_ids
    FROM assignments
    WHERE course_id = p_course_id;

    -- Get quiz IDs from course lessons
    IF v_lesson_ids IS NOT NULL AND array_length(v_lesson_ids, 1) > 0 THEN
        SELECT ARRAY_AGG(id) INTO v_quiz_ids
        FROM quizzes
        WHERE lesson_id = ANY(v_lesson_ids);
    END IF;

    -- 1. Delete todos linked to this course
    WITH deleted AS (
        DELETE FROM student_todos
        WHERE student_id = p_student_id
        AND course_id = p_course_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_todos_deleted FROM deleted;

    -- 2. Delete calendar events for assignments from this course
    IF v_assignment_ids IS NOT NULL AND array_length(v_assignment_ids, 1) > 0 THEN
        WITH deleted AS (
            DELETE FROM student_calendar_events
            WHERE student_id = p_student_id
            AND source_type = 'assignment'
            AND source_id = ANY(v_assignment_ids)
            RETURNING 1
        )
        SELECT v_calendar_deleted + COUNT(*) INTO v_calendar_deleted FROM deleted;
    END IF;

    -- Delete calendar events for quizzes from this course
    IF v_quiz_ids IS NOT NULL AND array_length(v_quiz_ids, 1) > 0 THEN
        WITH deleted AS (
            DELETE FROM student_calendar_events
            WHERE student_id = p_student_id
            AND source_type = 'quiz'
            AND source_id = ANY(v_quiz_ids)
            RETURNING 1
        )
        SELECT v_calendar_deleted + COUNT(*) INTO v_calendar_deleted FROM deleted;
    END IF;

    -- 3. Delete notes for this course
    WITH deleted AS (
        DELETE FROM student_notes
        WHERE student_id = p_student_id
        AND course_id = p_course_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_notes_deleted FROM deleted;

    -- Also delete notes linked to lessons in this course
    IF v_lesson_ids IS NOT NULL AND array_length(v_lesson_ids, 1) > 0 THEN
        WITH deleted AS (
            DELETE FROM student_notes
            WHERE student_id = p_student_id
            AND lesson_id = ANY(v_lesson_ids)
            RETURNING 1
        )
        SELECT v_notes_deleted + COUNT(*) INTO v_notes_deleted FROM deleted;
    END IF;

    -- 4. Delete course bookmark
    WITH deleted AS (
        DELETE FROM student_bookmarks
        WHERE student_id = p_student_id
        AND bookmark_type = 'course'
        AND bookmark_id = p_course_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_bookmarks_deleted FROM deleted;

    -- Delete lesson bookmarks
    IF v_lesson_ids IS NOT NULL AND array_length(v_lesson_ids, 1) > 0 THEN
        WITH deleted AS (
            DELETE FROM student_bookmarks
            WHERE student_id = p_student_id
            AND bookmark_type = 'lesson'
            AND bookmark_id = ANY(v_lesson_ids)
            RETURNING 1
        )
        SELECT v_bookmarks_deleted + COUNT(*) INTO v_bookmarks_deleted FROM deleted;
    END IF;

    RETURN jsonb_build_object(
        'todos_deleted', v_todos_deleted,
        'calendar_events_deleted', v_calendar_deleted,
        'notes_deleted', v_notes_deleted,
        'bookmarks_deleted', v_bookmarks_deleted
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- TRIGGER FOR AUTOMATIC CLEANUP
-- ================================================================

-- Trigger function to clean up student data when enrollment status changes to dropped/withdrawn
CREATE OR REPLACE FUNCTION on_enrollment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup when status changes to 'dropped' or 'withdrawn'
    IF NEW.status IN ('dropped', 'withdrawn') AND OLD.status = 'active' THEN
        PERFORM cleanup_student_course_data(NEW.student_id, NEW.course_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on enrollments table
DROP TRIGGER IF EXISTS enrollment_cleanup_trigger ON enrollments;
CREATE TRIGGER enrollment_cleanup_trigger
    AFTER UPDATE OF status ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION on_enrollment_status_change();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT EXECUTE ON FUNCTION cleanup_student_course_data TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_student_course_data TO service_role;
