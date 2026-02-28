-- ============================================================================
-- Migration 012: Functions, Triggers, Seed Data, and Grants
-- ============================================================================
-- Depends on: All previous migrations (001-011)
-- Contains: All helper functions, triggers, seed data, and grants
-- ============================================================================


-- ############################################################################
-- SECTION 1: HELPER FUNCTIONS
-- ############################################################################

-- --------------------------------------------------------------------------
-- 1.1 Translation helper
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_translation(
    p_content_type VARCHAR,
    p_content_id UUID,
    p_field_name VARCHAR,
    p_locale VARCHAR,
    p_fallback TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_translation TEXT;
BEGIN
    SELECT translation INTO v_translation
    FROM translations
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND field_name = p_field_name
      AND locale = p_locale;

    IF v_translation IS NOT NULL THEN
        RETURN v_translation;
    END IF;

    IF p_locale != 'en' THEN
        SELECT translation INTO v_translation
        FROM translations
        WHERE content_type = p_content_type
          AND content_id = p_content_id
          AND field_name = p_field_name
          AND locale = 'en';

        IF v_translation IS NOT NULL THEN
            RETURN v_translation;
        END IF;
    END IF;

    RETURN p_fallback;
END;
$$;

-- --------------------------------------------------------------------------
-- 1.2 Accessibility helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_accessibility_score(
    p_content_type VARCHAR,
    p_content_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT score INTO v_score
    FROM accessibility_reports
    WHERE content_type = p_content_type
      AND content_id = p_content_id;

    RETURN COALESCE(v_score, -1);
END;
$$;

CREATE OR REPLACE FUNCTION get_video_captions(p_video_url TEXT)
RETURNS TABLE (
    id UUID,
    language VARCHAR(10),
    label VARCHAR(100),
    caption_url TEXT,
    is_default BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vc.id,
        vc.language,
        vc.label,
        vc.caption_url,
        vc.is_default
    FROM video_captions vc
    WHERE vc.video_url = p_video_url
    ORDER BY vc.is_default DESC, vc.language ASC;
END;
$$;

-- --------------------------------------------------------------------------
-- 1.3 Lesson prerequisite check
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_lesson_prerequisites(
    p_student_id UUID,
    p_lesson_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_lesson RECORD;
    v_prereq_status RECORD;
    v_is_unlocked BOOLEAN := true;
    v_reason TEXT := '';
BEGIN
    SELECT l.*, prereq.title as prereq_title
    INTO v_lesson
    FROM lessons l
    LEFT JOIN lessons prereq ON l.prerequisite_lesson_id = prereq.id
    WHERE l.id = p_lesson_id;

    IF v_lesson.prerequisite_lesson_id IS NULL THEN
        RETURN jsonb_build_object('unlocked', true, 'reason', null, 'prerequisite', null);
    END IF;

    IF v_lesson.prerequisite_type = 'completion' THEN
        SELECT status INTO v_prereq_status
        FROM lesson_progress
        WHERE student_id = p_student_id AND lesson_id = v_lesson.prerequisite_lesson_id;

        IF v_prereq_status.status != 'completed' THEN
            v_is_unlocked := false;
            v_reason := 'Complete "' || v_lesson.prereq_title || '" first';
        END IF;

    ELSIF v_lesson.prerequisite_type = 'quiz_pass' THEN
        SELECT CASE WHEN qa.score >= COALESCE(v_lesson.prerequisite_min_score, q.passing_score, 70) THEN true ELSE false END
        INTO v_is_unlocked
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE q.lesson_id = v_lesson.prerequisite_lesson_id
          AND qa.student_id = p_student_id
          AND qa.status = 'completed'
        ORDER BY qa.score DESC
        LIMIT 1;

        IF NOT COALESCE(v_is_unlocked, false) THEN
            v_is_unlocked := false;
            v_reason := 'Pass the quiz in "' || v_lesson.prereq_title || '" with ' || COALESCE(v_lesson.prerequisite_min_score, 70) || '% or higher';
        END IF;

    ELSIF v_lesson.prerequisite_type = 'assignment_pass' THEN
        SELECT CASE WHEN ass.grade >= COALESCE(v_lesson.prerequisite_min_score, 70) THEN true ELSE false END
        INTO v_is_unlocked
        FROM assignment_submissions ass
        JOIN assignments a ON ass.assignment_id = a.id
        WHERE a.lesson_id = v_lesson.prerequisite_lesson_id
          AND ass.student_id = p_student_id
          AND ass.status = 'graded'
        ORDER BY ass.grade DESC
        LIMIT 1;

        IF NOT COALESCE(v_is_unlocked, false) THEN
            v_is_unlocked := false;
            v_reason := 'Complete the assignment in "' || v_lesson.prereq_title || '" with ' || COALESCE(v_lesson.prerequisite_min_score, 70) || '% or higher';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'unlocked', v_is_unlocked,
        'reason', CASE WHEN v_is_unlocked THEN null ELSE v_reason END,
        'prerequisite', jsonb_build_object(
            'id', v_lesson.prerequisite_lesson_id,
            'title', v_lesson.prereq_title,
            'type', v_lesson.prerequisite_type,
            'min_score', v_lesson.prerequisite_min_score
        )
    );
END;
$$;

-- --------------------------------------------------------------------------
-- 1.4 Learning path progress
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_learning_path_progress(
    p_student_id UUID,
    p_learning_path_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_courses INTEGER;
    v_completed_courses INTEGER;
    v_progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_courses
    FROM learning_path_courses
    WHERE learning_path_id = p_learning_path_id AND is_required = true;

    IF v_total_courses = 0 THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_completed_courses
    FROM learning_path_courses lpc
    JOIN enrollments e ON e.course_id = lpc.course_id
    WHERE lpc.learning_path_id = p_learning_path_id
      AND lpc.is_required = true
      AND e.student_id = p_student_id
      AND e.status = 'completed';

    v_progress := (v_completed_courses * 100) / v_total_courses;

    UPDATE learning_path_enrollments
    SET progress_percentage = v_progress,
        completed_at = CASE WHEN v_progress = 100 THEN NOW() ELSE NULL END,
        status = CASE WHEN v_progress = 100 THEN 'completed' ELSE status END
    WHERE student_id = p_student_id AND learning_path_id = p_learning_path_id;

    RETURN v_progress;
END;
$$;

-- --------------------------------------------------------------------------
-- 1.5 Student competency update
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_student_competency(
    p_student_id UUID,
    p_competency_id UUID,
    p_source_type VARCHAR,
    p_source_id UUID,
    p_score DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_level DECIMAL;
    v_new_level DECIMAL;
    v_evidence JSONB;
BEGIN
    SELECT current_level, evidence
    INTO v_current_level, v_evidence
    FROM student_competencies
    WHERE student_id = p_student_id AND competency_id = p_competency_id;

    IF v_current_level IS NULL THEN
        v_current_level := 0;
        v_evidence := '[]'::jsonb;
    END IF;

    v_evidence := v_evidence || jsonb_build_object(
        'source', p_source_type,
        'id', p_source_id,
        'score', p_score,
        'date', NOW()
    );

    v_new_level := LEAST(5, (v_current_level + (p_score / 20)) / 2);

    INSERT INTO student_competencies (student_id, competency_id, current_level, evidence, updated_at)
    VALUES (p_student_id, p_competency_id, v_new_level, v_evidence, NOW())
    ON CONFLICT (student_id, competency_id) DO UPDATE SET
        current_level = EXCLUDED.current_level,
        evidence = EXCLUDED.evidence,
        updated_at = NOW();
END;
$$;

-- --------------------------------------------------------------------------
-- 1.6 Student calendar/todo sync
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_student_calendar_from_deadlines(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    events_created INTEGER := 0;
    quiz_events INTEGER := 0;
BEGIN
    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, all_day
    )
    SELECT
        p_student_id, 'assignment', 'assignment', a.id,
        'Due: ' || a.title, 'Assignment due for ' || c.title,
        a.due_date, false
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
    WHERE a.due_date > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id AND sce.source_type = 'assignment' AND sce.source_id = a.id
    );
    GET DIAGNOSTICS events_created = ROW_COUNT;

    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, end_datetime
    )
    SELECT
        p_student_id, 'quiz', 'quiz', q.id,
        'Quiz: ' || q.title, 'Quiz available for ' || c.title,
        COALESCE(q.available_from, NOW()), q.available_until
    FROM quizzes q
    JOIN lessons l ON q.lesson_id = l.id
    JOIN courses c ON l.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
    WHERE (q.available_until IS NULL OR q.available_until > NOW())
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id AND sce.source_type = 'quiz' AND sce.source_id = q.id
    );
    GET DIAGNOSTICS quiz_events = ROW_COUNT;

    RETURN events_created + quiz_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sync_student_todos_from_deadlines(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    todos_created INTEGER := 0;
BEGIN
    INSERT INTO student_todos (
        student_id, source_type, source_id, course_id, title, description, due_date, priority, is_synced
    )
    SELECT
        p_student_id, 'assignment', a.id, a.course_id,
        a.title, LEFT(a.description, 500), a.due_date,
        CASE
            WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'urgent'
            WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 'high'
            WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 'medium'
            ELSE 'low'
        END,
        true
    FROM assignments a
    JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = p_student_id
    WHERE a.due_date > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.student_id = p_student_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM student_todos st
        WHERE st.student_id = p_student_id AND st.source_type = 'assignment' AND st.source_id = a.id
    );
    GET DIAGNOSTICS todos_created = ROW_COUNT;
    RETURN todos_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 1.7 Study group helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_group_join_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FOR 8));
        SELECT COUNT(*) INTO exists_count FROM study_groups WHERE join_code = code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_generate_join_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := generate_group_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_add_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO study_group_members (group_id, student_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_overdue_todos()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE student_todos
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
    AND due_date < NOW();
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 1.8 Survey analytics
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_survey_analytics(p_survey_id UUID)
RETURNS VOID AS $$
DECLARE
    v_response_count INTEGER;
    v_completed_count INTEGER;
    v_completion_rate NUMERIC;
    v_avg_time INTEGER;
    v_question_stats JSONB := '{}';
    v_question RECORD;
    v_stats JSONB;
BEGIN
    SELECT COUNT(*) INTO v_response_count
    FROM survey_responses WHERE survey_id = p_survey_id;

    SELECT COUNT(*) INTO v_completed_count
    FROM survey_responses WHERE survey_id = p_survey_id AND status = 'submitted';

    IF v_response_count > 0 THEN
        v_completion_rate := (v_completed_count::NUMERIC / v_response_count) * 100;
    ELSE
        v_completion_rate := 0;
    END IF;

    SELECT AVG(completion_time) INTO v_avg_time
    FROM survey_responses
    WHERE survey_id = p_survey_id AND status = 'submitted' AND completion_time IS NOT NULL;

    FOR v_question IN SELECT id, type FROM survey_questions WHERE survey_id = p_survey_id
    LOOP
        v_stats := jsonb_build_object('response_count', v_completed_count);
        v_question_stats := v_question_stats || jsonb_build_object(v_question.id::text, v_stats);
    END LOOP;

    INSERT INTO survey_analytics (survey_id, response_count, completion_rate, avg_completion_time, question_stats, last_computed_at)
    VALUES (p_survey_id, v_completed_count, v_completion_rate, v_avg_time, v_question_stats, NOW())
    ON CONFLICT (survey_id) DO UPDATE SET
        response_count = EXCLUDED.response_count,
        completion_rate = EXCLUDED.completion_rate,
        avg_completion_time = EXCLUDED.avg_completion_time,
        question_stats = EXCLUDED.question_stats,
        last_computed_at = EXCLUDED.last_computed_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION on_survey_response_submit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
        PERFORM compute_survey_analytics(NEW.survey_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 1.9 Category path helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_category_path(category_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    slug VARCHAR(100),
    level INTEGER
) AS $$
WITH RECURSIVE category_path AS (
    SELECT cc.id, cc.name, cc.slug, cc.parent_id, 1 as level
    FROM course_categories cc WHERE cc.id = category_id
    UNION ALL
    SELECT cc.id, cc.name, cc.slug, cc.parent_id, cp.level + 1
    FROM course_categories cc
    INNER JOIN category_path cp ON cc.id = cp.parent_id
)
SELECT category_path.id, category_path.name, category_path.slug, category_path.level
FROM category_path ORDER BY level DESC;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
RETURNS TABLE (id UUID) AS $$
WITH RECURSIVE descendants AS (
    SELECT cc.id FROM course_categories cc WHERE cc.parent_id = parent_category_id
    UNION ALL
    SELECT cc.id FROM course_categories cc INNER JOIN descendants d ON cc.parent_id = d.id
)
SELECT id FROM descendants;
$$ LANGUAGE SQL;

-- --------------------------------------------------------------------------
-- 1.10 Graded discussion helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_discussion_grade_item()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_graded = true AND NEW.points IS NOT NULL AND NEW.points > 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM course_grade_items
            WHERE assessment_id = NEW.id AND type = 'discussion'
        ) THEN
            INSERT INTO course_grade_items (
                course_id, title, type, category, points, assessment_id, due_date, tenant_id
            ) VALUES (
                NEW.course_id, 'Discussion: ' || NEW.title, 'discussion', 'Discussions',
                NEW.points, NEW.id, NEW.due_date, NEW.tenant_id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_discussion_grade_to_gradebook()
RETURNS TRIGGER AS $$
DECLARE
    grade_item_id UUID;
BEGIN
    SELECT id INTO grade_item_id
    FROM course_grade_items
    WHERE assessment_id = NEW.discussion_id AND type = 'discussion';

    IF grade_item_id IS NOT NULL AND NEW.score IS NOT NULL THEN
        INSERT INTO course_grades (
            course_id, student_id, grade_item_id, score, max_score,
            percentage, feedback, graded_by, graded_at, tenant_id
        ) VALUES (
            NEW.course_id, NEW.student_id, grade_item_id, NEW.score, NEW.max_score,
            NEW.percentage, NEW.feedback, NEW.graded_by, NEW.graded_at, NEW.tenant_id
        )
        ON CONFLICT (student_id, grade_item_id)
        DO UPDATE SET
            score = EXCLUDED.score,
            max_score = EXCLUDED.max_score,
            percentage = EXCLUDED.percentage,
            feedback = EXCLUDED.feedback,
            graded_by = EXCLUDED.graded_by,
            graded_at = EXCLUDED.graded_at,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1.11 Global discussion helpers
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_global_discussion_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_discussions
        SET reply_count = reply_count + 1,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_discussions
        SET reply_count = GREATEST(0, reply_count - 1),
            updated_at = NOW()
        WHERE id = OLD.discussion_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_global_discussion_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        IF COALESCE(NEW.discussion_id, OLD.discussion_id) IS NOT NULL THEN
            UPDATE global_discussions
            SET vote_count = (
                SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END), 0)
                FROM global_discussion_votes
                WHERE discussion_id = COALESCE(NEW.discussion_id, OLD.discussion_id)
            ),
            updated_at = NOW()
            WHERE id = COALESCE(NEW.discussion_id, OLD.discussion_id);
        END IF;

        IF COALESCE(NEW.reply_id, OLD.reply_id) IS NOT NULL THEN
            UPDATE global_discussion_replies
            SET vote_count = (
                SELECT COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END), 0)
                FROM global_discussion_votes
                WHERE reply_id = COALESCE(NEW.reply_id, OLD.reply_id)
            ),
            updated_at = NOW()
            WHERE id = COALESCE(NEW.reply_id, OLD.reply_id);
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_subscribe_discussion_author()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO global_discussion_subscriptions (discussion_id, user_id, notify_on_reply, tenant_id)
    VALUES (NEW.id, NEW.author_id, true, NEW.tenant_id)
    ON CONFLICT (discussion_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1.12 Tenant settings seed
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_settings (tenant_id, setting_key, setting_value, setting_type, description)
    SELECT
        NEW.id, s.setting_key, s.setting_value, s.setting_type, s.description
    FROM site_settings s
    WHERE s.tenant_id = '00000000-0000-0000-0000-000000000001'
    ON CONFLICT (tenant_id, setting_key) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1.13 Programme auto-enroll
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_enroll_programme_courses()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO enrollments (student_id, course_id, status, tenant_id)
    SELECT NEW.student_id, pc.course_id, 'active', NEW.tenant_id
    FROM programme_courses pc
    WHERE pc.programme_id = NEW.programme_id
    AND NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.student_id = NEW.student_id AND e.course_id = pc.course_id
    )
    ON CONFLICT (student_id, course_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1.14 AI usage functions
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_ai_usage_today(user_uuid UUID)
RETURNS TABLE(api_calls INTEGER, tokens_used INTEGER, cost_usd DECIMAL(10, 4)) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ut.api_calls, 0) as api_calls,
        COALESCE(ut.tokens_used, 0) as tokens_used,
        COALESCE(ut.cost_usd, 0.00) as cost_usd
    FROM ai_usage_tracking ut
    WHERE ut.user_id = user_uuid AND ut.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_ai_context()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_context_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_ai_usage(
    user_uuid UUID,
    additional_calls INTEGER DEFAULT 1,
    additional_tokens INTEGER DEFAULT 0,
    additional_cost DECIMAL(10, 4) DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_usage_tracking (user_id, api_calls, tokens_used, cost_usd, date)
    VALUES (user_uuid, additional_calls, additional_tokens, additional_cost, CURRENT_DATE)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        api_calls = ai_usage_tracking.api_calls + additional_calls,
        tokens_used = ai_usage_tracking.tokens_used + additional_tokens,
        cost_usd = ai_usage_tracking.cost_usd + additional_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 1.15 Engagement score calculation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_student_id UUID,
    p_course_id UUID,
    p_date DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_score NUMERIC := 0;
BEGIN
    SELECT
        COALESCE(
            (login_count * 0.1) +
            (LEAST(time_spent_minutes / 60.0, 1) * 100 * 0.2) +
            (LEAST(assignments_submitted / 10.0, 1) * 100 * 0.3) +
            (LEAST(quizzes_completed / 5.0, 1) * 100 * 0.2) +
            (LEAST(discussions_participated / 3.0, 1) * 100 * 0.1) +
            (LEAST(lessons_completed / 20.0, 1) * 100 * 0.1),
            0
        )
    INTO v_score
    FROM engagement_metrics
    WHERE student_id = p_student_id
      AND course_id = p_course_id
      AND metric_date = p_date;

    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;


-- ############################################################################
-- SECTION 2: TRIGGERS
-- ############################################################################

-- --------------------------------------------------------------------------
-- 2.1 updated_at triggers (using update_updated_at_column from 001)
-- --------------------------------------------------------------------------

-- Core tables
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Discussion tables
DROP TRIGGER IF EXISTS update_course_discussions_updated_at ON course_discussions;
CREATE TRIGGER update_course_discussions_updated_at BEFORE UPDATE ON course_discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discussions_updated_at ON discussions;
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Content tables
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_links_updated_at ON resource_links;
CREATE TRIGGER update_resource_links_updated_at BEFORE UPDATE ON resource_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_conferences_updated_at ON video_conferences;
CREATE TRIGGER update_video_conferences_updated_at BEFORE UPDATE ON video_conferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Credentials
DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_certificate_templates_updated_at ON certificate_templates;
CREATE TRIGGER update_certificate_templates_updated_at BEFORE UPDATE ON certificate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- i18n/accessibility
DROP TRIGGER IF EXISTS translations_updated_at ON translations;
CREATE TRIGGER translations_updated_at BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS supported_locales_updated_at ON supported_locales;
CREATE TRIGGER supported_locales_updated_at BEFORE UPDATE ON supported_locales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS video_captions_updated_at ON video_captions;
CREATE TRIGGER video_captions_updated_at BEFORE UPDATE ON video_captions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS accessibility_prefs_updated_at ON accessibility_preferences;
CREATE TRIGGER accessibility_prefs_updated_at BEFORE UPDATE ON accessibility_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Learning paths
DROP TRIGGER IF EXISTS learning_paths_updated_at ON learning_paths;
CREATE TRIGGER learning_paths_updated_at BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS competencies_updated_at ON competencies;
CREATE TRIGGER competencies_updated_at BEFORE UPDATE ON competencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS adaptive_rules_updated_at ON adaptive_rules;
CREATE TRIGGER adaptive_rules_updated_at BEFORE UPDATE ON adaptive_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Surveys
DROP TRIGGER IF EXISTS update_surveys_updated_at ON surveys;
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Programmes
DROP TRIGGER IF EXISTS update_programmes_updated_at ON programmes;
CREATE TRIGGER update_programmes_updated_at BEFORE UPDATE ON programmes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CRM tables
DROP TRIGGER IF EXISTS update_crm_student_lifecycle_updated_at ON crm_student_lifecycle;
CREATE TRIGGER update_crm_student_lifecycle_updated_at BEFORE UPDATE ON crm_student_lifecycle
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_interactions_updated_at ON crm_interactions;
CREATE TRIGGER update_crm_interactions_updated_at BEFORE UPDATE ON crm_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_engagement_config_updated_at ON crm_engagement_config;
CREATE TRIGGER update_crm_engagement_config_updated_at BEFORE UPDATE ON crm_engagement_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_segments_updated_at ON crm_segments;
CREATE TRIGGER update_crm_segments_updated_at BEFORE UPDATE ON crm_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_campaigns_updated_at ON crm_campaigns;
CREATE TRIGGER update_crm_campaigns_updated_at BEFORE UPDATE ON crm_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_workflows_updated_at ON crm_workflows;
CREATE TRIGGER update_crm_workflows_updated_at BEFORE UPDATE ON crm_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Advanced analytics
DROP TRIGGER IF EXISTS update_data_warehouse_configs_updated_at ON data_warehouse_configs;
CREATE TRIGGER update_data_warehouse_configs_updated_at BEFORE UPDATE ON data_warehouse_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_etl_pipeline_schedules_updated_at ON etl_pipeline_schedules;
CREATE TRIGGER update_etl_pipeline_schedules_updated_at BEFORE UPDATE ON etl_pipeline_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_analytics_models_updated_at ON learning_analytics_models;
CREATE TRIGGER update_learning_analytics_models_updated_at BEFORE UPDATE ON learning_analytics_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_reports_updated_at ON custom_reports;
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON notification_channels;
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_announcements_updated_at ON global_announcements;
CREATE TRIGGER update_global_announcements_updated_at BEFORE UPDATE ON global_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 2.2 Business logic triggers
-- --------------------------------------------------------------------------

-- Study groups: auto-generate join code
DROP TRIGGER IF EXISTS study_groups_join_code_trigger ON study_groups;
CREATE TRIGGER study_groups_join_code_trigger
    BEFORE INSERT ON study_groups
    FOR EACH ROW EXECUTE FUNCTION auto_generate_join_code();

-- Study groups: auto-add creator as owner
DROP TRIGGER IF EXISTS study_groups_add_creator_trigger ON study_groups;
CREATE TRIGGER study_groups_add_creator_trigger
    AFTER INSERT ON study_groups
    FOR EACH ROW EXECUTE FUNCTION auto_add_group_creator();

-- Surveys: auto-compute analytics on response submit
DROP TRIGGER IF EXISTS survey_response_submit_trigger ON survey_responses;
CREATE TRIGGER survey_response_submit_trigger
    AFTER INSERT OR UPDATE OF status ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION on_survey_response_submit();

-- Graded discussions: auto-create grade item
DROP TRIGGER IF EXISTS create_discussion_grade_item_trigger ON course_discussions;
CREATE TRIGGER create_discussion_grade_item_trigger
    AFTER INSERT OR UPDATE OF is_graded, points, due_date ON course_discussions
    FOR EACH ROW EXECUTE FUNCTION create_discussion_grade_item();

-- Graded discussions: sync grades to gradebook
DROP TRIGGER IF EXISTS sync_discussion_grade_trigger ON discussion_grades;
CREATE TRIGGER sync_discussion_grade_trigger
    AFTER INSERT OR UPDATE OF score, feedback ON discussion_grades
    FOR EACH ROW EXECUTE FUNCTION sync_discussion_grade_to_gradebook();

-- Global discussions: update reply stats
DROP TRIGGER IF EXISTS trigger_update_global_discussion_reply_stats ON global_discussion_replies;
CREATE TRIGGER trigger_update_global_discussion_reply_stats
    AFTER INSERT OR DELETE ON global_discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_global_discussion_reply_stats();

-- Global discussions: update vote counts
DROP TRIGGER IF EXISTS trigger_update_global_discussion_vote_count ON global_discussion_votes;
CREATE TRIGGER trigger_update_global_discussion_vote_count
    AFTER INSERT OR UPDATE OR DELETE ON global_discussion_votes
    FOR EACH ROW EXECUTE FUNCTION update_global_discussion_vote_count();

-- Global discussions: auto-subscribe author
DROP TRIGGER IF EXISTS trigger_auto_subscribe_discussion_author ON global_discussions;
CREATE TRIGGER trigger_auto_subscribe_discussion_author
    AFTER INSERT ON global_discussions
    FOR EACH ROW EXECUTE FUNCTION auto_subscribe_discussion_author();

-- Tenant settings: auto-seed on new tenant
DROP TRIGGER IF EXISTS after_tenant_insert_seed_settings ON tenants;
CREATE TRIGGER after_tenant_insert_seed_settings
    AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION seed_tenant_settings();

-- Programme enrollments: auto-enroll in courses
DROP TRIGGER IF EXISTS trg_auto_enroll_programme_courses ON programme_enrollments;
CREATE TRIGGER trg_auto_enroll_programme_courses
    AFTER INSERT ON programme_enrollments
    FOR EACH ROW EXECUTE FUNCTION auto_enroll_programme_courses();


-- ############################################################################
-- SECTION 3: SEED DATA
-- ############################################################################

-- --------------------------------------------------------------------------
-- 3.1 Default supported locales
-- --------------------------------------------------------------------------
INSERT INTO supported_locales (code, name, native_name, is_rtl, is_active, sort_order)
VALUES
    ('en', 'English', 'English', false, true, 1),
    ('es', 'Spanish', 'Español', false, true, 2),
    ('fr', 'French', 'Français', false, true, 3)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.2 Default course categories
-- --------------------------------------------------------------------------
INSERT INTO course_categories (name, slug, description, icon, color, "order") VALUES
    ('Academic', 'academic', 'Traditional academic subjects and disciplines', 'material-symbols:school', '#3B82F6', 1),
    ('Professional Development', 'professional-development', 'Career and professional skills training', 'material-symbols:work', '#8B5CF6', 2),
    ('Technology', 'technology', 'Computer science, programming, and digital skills', 'material-symbols:computer', '#10B981', 3),
    ('Leadership', 'leadership', 'Leadership and management training', 'material-symbols:groups', '#F59E0B', 4),
    ('Compliance', 'compliance', 'Regulatory and compliance training', 'material-symbols:verified', '#EF4444', 5)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories under Academic
INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT 'Mathematics', 'mathematics', 'Math courses and quantitative skills', 'material-symbols:calculate', '#3B82F6', id, 1
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT 'Science', 'science', 'Natural and physical sciences', 'material-symbols:science', '#10B981', id, 2
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT 'Language Arts', 'language-arts', 'Reading, writing, and communication', 'material-symbols:menu-book', '#8B5CF6', id, 3
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_categories (name, slug, description, icon, color, parent_id, "order")
SELECT 'Social Studies', 'social-studies', 'History, geography, and civics', 'material-symbols:public', '#F59E0B', id, 4
FROM course_categories WHERE slug = 'academic'
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.3 Default global discussion categories
-- --------------------------------------------------------------------------
INSERT INTO global_discussion_categories (name, slug, description, icon, color, display_order) VALUES
    ('General', 'general', 'General platform discussions', 'mdi:forum', 'blue', 1),
    ('Academic', 'academic', 'Academic questions and study help', 'mdi:school', 'green', 2),
    ('Campus Life', 'campus-life', 'Campus events and social topics', 'mdi:account-group', 'purple', 3),
    ('Career & Jobs', 'career-jobs', 'Career advice and job opportunities', 'mdi:briefcase', 'amber', 4),
    ('Technical Support', 'technical-support', 'Platform help and technical issues', 'mdi:help-circle', 'red', 5),
    ('Announcements', 'announcements', 'Official platform announcements', 'mdi:bullhorn', 'indigo', 0)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.4 Default competencies
-- --------------------------------------------------------------------------
INSERT INTO competencies (name, description, category, level)
VALUES
    ('Critical Thinking', 'Ability to analyze information objectively', 'soft-skills', 1),
    ('Problem Solving', 'Ability to find solutions to difficult issues', 'soft-skills', 1),
    ('Communication', 'Ability to convey information effectively', 'soft-skills', 1),
    ('Digital Literacy', 'Understanding and using digital technologies', 'technical', 1),
    ('Data Analysis', 'Ability to interpret and analyze data', 'technical', 2)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.5 Default discussion rubric templates
-- --------------------------------------------------------------------------
INSERT INTO discussion_rubric_templates (name, description, rubric, is_system)
VALUES
(
    'Standard Discussion Rubric',
    'General rubric covering quality, engagement, and timeliness',
    '[
        {
            "id": "quality",
            "criteria": "Quality of Posts",
            "levels": [
                {"name": "Excellent", "description": "Demonstrates deep understanding with specific examples", "points": 25},
                {"name": "Good", "description": "Shows good understanding with some supporting evidence", "points": 20},
                {"name": "Satisfactory", "description": "Basic understanding demonstrated", "points": 15},
                {"name": "Needs Improvement", "description": "Minimal effort or off-topic", "points": 5}
            ]
        },
        {
            "id": "engagement",
            "criteria": "Engagement with Peers",
            "levels": [
                {"name": "Excellent", "description": "Responds thoughtfully to multiple peers", "points": 25},
                {"name": "Good", "description": "Meaningful response to at least one peer", "points": 20},
                {"name": "Satisfactory", "description": "Brief response to peers", "points": 15},
                {"name": "Needs Improvement", "description": "No peer engagement", "points": 5}
            ]
        }
    ]'::jsonb,
    true
),
(
    'Peer Interaction Rubric',
    'Emphasizes collaborative discussion and response quality',
    '[
        {
            "id": "initial_post",
            "criteria": "Initial Post",
            "levels": [
                {"name": "Excellent", "description": "Well-researched, original perspective with cited sources", "points": 30},
                {"name": "Good", "description": "Good original thought with supporting details", "points": 24},
                {"name": "Satisfactory", "description": "Addresses the prompt adequately", "points": 18},
                {"name": "Needs Improvement", "description": "Minimal effort or misses the prompt", "points": 10}
            ]
        },
        {
            "id": "responses",
            "criteria": "Responses to Peers",
            "levels": [
                {"name": "Excellent", "description": "Advances discussion with questions and new insights", "points": 40},
                {"name": "Good", "description": "Substantive response building on peer ideas", "points": 32},
                {"name": "Satisfactory", "description": "Agreeable response with some added value", "points": 24},
                {"name": "Needs Improvement", "description": "Generic or no response", "points": 10}
            ]
        },
        {
            "id": "timeliness",
            "criteria": "Timeliness",
            "levels": [
                {"name": "Excellent", "description": "All posts on time with ongoing participation", "points": 30},
                {"name": "Good", "description": "Most posts on time", "points": 24},
                {"name": "Satisfactory", "description": "Some late posts", "points": 18},
                {"name": "Needs Improvement", "description": "Late or rushed participation", "points": 10}
            ]
        }
    ]'::jsonb,
    true
),
(
    'Critical Thinking Rubric',
    'Emphasizes analysis and critical evaluation',
    '[
        {
            "id": "analysis",
            "criteria": "Critical Analysis",
            "levels": [
                {"name": "Excellent", "description": "Deep analysis with multiple perspectives considered", "points": 35},
                {"name": "Good", "description": "Good analysis with some critical evaluation", "points": 28},
                {"name": "Satisfactory", "description": "Basic analysis", "points": 21},
                {"name": "Needs Improvement", "description": "Surface-level only", "points": 10}
            ]
        },
        {
            "id": "synthesis",
            "criteria": "Synthesis of Ideas",
            "levels": [
                {"name": "Excellent", "description": "Connects concepts across topics and discussions", "points": 35},
                {"name": "Good", "description": "Makes relevant connections", "points": 28},
                {"name": "Satisfactory", "description": "Some connections made", "points": 21},
                {"name": "Needs Improvement", "description": "Ideas remain isolated", "points": 10}
            ]
        },
        {
            "id": "questioning",
            "criteria": "Thoughtful Questioning",
            "levels": [
                {"name": "Excellent", "description": "Poses thought-provoking questions that deepen discussion", "points": 30},
                {"name": "Good", "description": "Asks relevant follow-up questions", "points": 24},
                {"name": "Satisfactory", "description": "Some questions posed", "points": 18},
                {"name": "Needs Improvement", "description": "No questions or clarification sought", "points": 10}
            ]
        }
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.6 Default survey templates
-- --------------------------------------------------------------------------
INSERT INTO survey_templates (name, description, survey_type, questions, is_system)
VALUES
    (
        'Course Evaluation',
        'Comprehensive course evaluation covering content quality, instructor effectiveness, and overall satisfaction',
        'course_evaluation',
        '[
            {"type": "likert_scale", "question_text": "The course content was well-organized and easy to follow", "required": true, "category": "Content"},
            {"type": "likert_scale", "question_text": "The course materials were helpful and relevant", "required": true, "category": "Content"},
            {"type": "rating_scale", "question_text": "How would you rate the overall quality of this course?", "required": true, "category": "Overall"},
            {"type": "essay", "question_text": "What did you like most about this course?", "required": false, "category": "Feedback"},
            {"type": "essay", "question_text": "What could be improved?", "required": false, "category": "Feedback"}
        ]'::jsonb,
        true
    ),
    (
        'Instructor Feedback',
        'Evaluate instructor teaching effectiveness, communication, and engagement',
        'instructor_evaluation',
        '[
            {"type": "likert_scale", "question_text": "The instructor explained concepts clearly", "required": true, "category": "Teaching"},
            {"type": "likert_scale", "question_text": "The instructor was responsive to questions", "required": true, "category": "Communication"},
            {"type": "rating_scale", "question_text": "Rate the instructor overall", "required": true, "category": "Overall"},
            {"type": "text", "question_text": "Any additional comments for the instructor?", "required": false, "category": "Comments"}
        ]'::jsonb,
        true
    ),
    (
        'NPS Survey',
        'Net Promoter Score survey to measure student loyalty and satisfaction',
        'nps',
        '[
            {"type": "nps", "question_text": "How likely are you to recommend this course to a friend or colleague?", "required": true, "category": "NPS"},
            {"type": "text", "question_text": "What is the primary reason for your score?", "required": false, "category": "Reason"}
        ]'::jsonb,
        true
    )
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 3.7 Default CRM engagement config
-- --------------------------------------------------------------------------
INSERT INTO crm_engagement_config (config_name, is_active)
VALUES ('default', true)
ON CONFLICT DO NOTHING;


-- ############################################################################
-- SECTION 4: GRANTS
-- ############################################################################

-- --------------------------------------------------------------------------
-- 4.1 Schema usage
-- --------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- --------------------------------------------------------------------------
-- 4.2 Core tables
-- --------------------------------------------------------------------------
GRANT ALL ON users TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON courses TO service_role;
GRANT ALL ON subjects TO service_role;
GRANT ALL ON lessons TO service_role;
GRANT ALL ON enrollments TO service_role;
GRANT ALL ON classes TO service_role;
GRANT ALL ON class_instructors TO service_role;
GRANT ALL ON class_students TO service_role;
GRANT ALL ON course_instructors TO service_role;

-- --------------------------------------------------------------------------
-- 4.3 Assessment & Grading
-- --------------------------------------------------------------------------
GRANT ALL ON quizzes TO service_role;
GRANT ALL ON questions TO service_role;
GRANT ALL ON quiz_attempts TO service_role;
GRANT ALL ON quiz_proctor_logs TO service_role;
GRANT ALL ON quiz_extensions TO service_role;
GRANT ALL ON assignments TO service_role;
GRANT ALL ON assignment_submissions TO service_role;
GRANT ALL ON course_gradebook_settings TO service_role;
GRANT ALL ON course_grade_items TO service_role;
GRANT ALL ON course_grades TO service_role;
GRANT ALL ON grade_items TO service_role;
GRANT ALL ON grades TO service_role;

-- --------------------------------------------------------------------------
-- 4.4 Progress
-- --------------------------------------------------------------------------
GRANT ALL ON lesson_progress TO service_role;
GRANT ALL ON progress TO service_role;
GRANT ALL ON content_item_progress TO service_role;

-- --------------------------------------------------------------------------
-- 4.5 Discussions
-- --------------------------------------------------------------------------
GRANT ALL ON course_discussions TO service_role;
GRANT ALL ON discussions TO service_role;
GRANT ALL ON discussion_replies TO service_role;
GRANT ALL ON discussion_votes TO service_role;
GRANT ALL ON lesson_discussions TO service_role;
GRANT ALL ON lesson_discussion_replies TO service_role;
GRANT ALL ON lesson_discussion_votes TO service_role;
GRANT ALL ON discussion_grades TO service_role;
GRANT ALL ON discussion_rubric_templates TO service_role;
GRANT ALL ON course_announcements TO service_role;
GRANT ALL ON announcement_views TO service_role;

-- --------------------------------------------------------------------------
-- 4.6 Content & Resources
-- --------------------------------------------------------------------------
GRANT ALL ON files TO service_role;
GRANT ALL ON resource_links TO service_role;
GRANT ALL ON scorm_packages TO service_role;
GRANT ALL ON scorm_tracking TO service_role;
GRANT ALL ON video_conferences TO service_role;
GRANT ALL ON conference_participants TO service_role;
GRANT ALL ON conference_recordings TO service_role;
GRANT ALL ON attendance TO service_role;
GRANT ALL ON peer_review_assignments TO service_role;
GRANT ALL ON peer_reviews TO service_role;
GRANT ALL ON course_groups TO service_role;
GRANT ALL ON course_group_members TO service_role;

-- --------------------------------------------------------------------------
-- 4.7 Credentials & Gamification
-- --------------------------------------------------------------------------
GRANT ALL ON badges TO service_role;
GRANT ALL ON user_badges TO service_role;
GRANT ALL ON certificate_templates TO service_role;
GRANT ALL ON certificates TO service_role;
GRANT ALL ON ceu_credits TO service_role;
GRANT ALL ON gamification_profiles TO service_role;
GRANT ALL ON gamification_xp_ledger TO service_role;
GRANT ALL ON transcripts TO service_role;

-- --------------------------------------------------------------------------
-- 4.8 AI Tables
-- --------------------------------------------------------------------------
GRANT ALL ON ai_tutor_preferences TO service_role;
GRANT ALL ON ai_tutor_conversations TO service_role;
GRANT ALL ON ai_tutor_analytics TO service_role;
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON ai_messages TO authenticated;
GRANT ALL ON ai_usage_tracking TO authenticated;
GRANT ALL ON ai_context_cache TO authenticated;
GRANT ALL ON ai_conversations TO service_role;
GRANT ALL ON ai_messages TO service_role;
GRANT ALL ON ai_usage_tracking TO service_role;
GRANT ALL ON ai_context_cache TO service_role;

-- --------------------------------------------------------------------------
-- 4.9 Notifications & Analytics
-- --------------------------------------------------------------------------
GRANT ALL ON in_app_notifications TO service_role;
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON email_notifications TO service_role;
GRANT ALL ON email_digests TO service_role;
GRANT ALL ON email_templates TO service_role;
GRANT ALL ON student_activity_log TO service_role;
GRANT ALL ON analytics_dashboards TO service_role;
GRANT ALL ON analytics_reports TO service_role;
GRANT ALL ON analytics_metrics TO service_role;
GRANT ALL ON student_risk_scores TO service_role;
GRANT ALL ON custom_reports TO service_role;
GRANT ALL ON report_schedules TO service_role;
GRANT ALL ON ai_insights TO service_role;

-- --------------------------------------------------------------------------
-- 4.10 Learning Paths & Student Experience
-- --------------------------------------------------------------------------
GRANT ALL ON learning_paths TO service_role;
GRANT ALL ON learning_path_courses TO service_role;
GRANT ALL ON learning_path_enrollments TO service_role;
GRANT ALL ON competencies TO service_role;
GRANT ALL ON course_competencies TO service_role;
GRANT ALL ON lesson_competencies TO service_role;
GRANT ALL ON student_competencies TO service_role;
GRANT ALL ON adaptive_rules TO service_role;
GRANT ALL ON student_adaptive_recommendations TO service_role;
GRANT ALL ON student_notes TO authenticated;
GRANT ALL ON student_bookmarks TO authenticated;
GRANT ALL ON student_calendar_events TO authenticated;
GRANT ALL ON student_todos TO authenticated;
GRANT ALL ON study_groups TO authenticated;
GRANT ALL ON study_group_members TO authenticated;
GRANT ALL ON study_group_messages TO authenticated;
GRANT ALL ON study_group_events TO authenticated;
GRANT ALL ON student_study_sessions TO authenticated;

-- --------------------------------------------------------------------------
-- 4.11 Surveys, Categories, i18n, Accessibility
-- --------------------------------------------------------------------------
GRANT ALL ON surveys TO authenticated;
GRANT ALL ON survey_questions TO authenticated;
GRANT ALL ON survey_responses TO authenticated;
GRANT ALL ON survey_analytics TO authenticated;
GRANT ALL ON survey_templates TO authenticated;
GRANT ALL ON surveys TO service_role;
GRANT ALL ON survey_questions TO service_role;
GRANT ALL ON survey_responses TO service_role;
GRANT ALL ON survey_analytics TO service_role;
GRANT ALL ON survey_templates TO service_role;
GRANT SELECT ON course_categories TO authenticated;
GRANT SELECT ON course_category_assignments TO authenticated;
GRANT ALL ON course_categories TO service_role;
GRANT ALL ON course_category_assignments TO service_role;
GRANT ALL ON translations TO service_role;
GRANT ALL ON supported_locales TO service_role;
GRANT ALL ON accessibility_reports TO service_role;
GRANT ALL ON video_captions TO service_role;
GRANT ALL ON accessibility_preferences TO service_role;

-- --------------------------------------------------------------------------
-- 4.12 Programmes & Admissions
-- --------------------------------------------------------------------------
GRANT SELECT ON programmes TO authenticated;
GRANT SELECT ON programme_courses TO authenticated;
GRANT SELECT, INSERT ON programme_enrollments TO authenticated;
GRANT ALL ON programmes TO service_role;
GRANT ALL ON programme_courses TO service_role;
GRANT ALL ON programme_enrollments TO service_role;
GRANT ALL ON admission_forms TO service_role;
GRANT ALL ON admission_form_fields TO service_role;
GRANT ALL ON admission_applications TO service_role;
GRANT ALL ON admission_documents TO service_role;
GRANT ALL ON admission_reviews TO service_role;

-- --------------------------------------------------------------------------
-- 4.13 CRM
-- --------------------------------------------------------------------------
GRANT ALL ON crm_student_lifecycle TO service_role;
GRANT ALL ON crm_interactions TO service_role;
GRANT ALL ON crm_engagement_config TO service_role;
GRANT ALL ON crm_engagement_scores TO service_role;
GRANT ALL ON crm_segments TO service_role;
GRANT ALL ON crm_segment_members TO service_role;
GRANT ALL ON crm_campaigns TO service_role;
GRANT ALL ON crm_campaign_recipients TO service_role;
GRANT ALL ON crm_tasks TO service_role;
GRANT ALL ON crm_workflows TO service_role;
GRANT ALL ON crm_workflow_executions TO service_role;
GRANT SELECT ON programme_application_fields TO authenticated;
GRANT SELECT, INSERT ON programme_applications TO authenticated;
GRANT SELECT ON programme_application_fields TO anon;
GRANT ALL ON programme_application_fields TO service_role;
GRANT ALL ON programme_applications TO service_role;

-- --------------------------------------------------------------------------
-- 4.14 Global Discussions
-- --------------------------------------------------------------------------
GRANT ALL ON global_discussion_categories TO service_role;
GRANT ALL ON global_discussions TO service_role;
GRANT ALL ON global_discussion_replies TO service_role;
GRANT ALL ON global_discussion_votes TO service_role;
GRANT ALL ON global_discussion_subscriptions TO service_role;
GRANT ALL ON global_discussion_categories TO authenticated;
GRANT ALL ON global_discussions TO authenticated;
GRANT ALL ON global_discussion_replies TO authenticated;
GRANT ALL ON global_discussion_votes TO authenticated;
GRANT ALL ON global_discussion_subscriptions TO authenticated;

-- --------------------------------------------------------------------------
-- 4.15 Advanced Analytics & Omnichannel
-- --------------------------------------------------------------------------
GRANT ALL ON data_warehouse_configs TO service_role;
GRANT ALL ON etl_pipeline_jobs TO service_role;
GRANT ALL ON etl_pipeline_schedules TO service_role;
GRANT ALL ON student_risk_indicators TO service_role;
GRANT ALL ON learning_analytics_models TO service_role;
GRANT ALL ON learning_analytics_predictions TO service_role;
GRANT ALL ON engagement_metrics TO service_role;
GRANT ALL ON custom_report_executions TO service_role;
GRANT ALL ON notification_channels TO service_role;
GRANT ALL ON omnichannel_notifications TO service_role;
GRANT ALL ON sms_notifications TO service_role;
GRANT ALL ON whatsapp_notifications TO service_role;
GRANT ALL ON push_notifications TO service_role;
GRANT ALL ON global_announcements TO service_role;

-- --------------------------------------------------------------------------
-- 4.16 Tenants
-- --------------------------------------------------------------------------
GRANT ALL ON tenants TO service_role;
GRANT ALL ON tenant_memberships TO service_role;
GRANT ALL ON site_settings TO service_role;
GRANT ALL ON system_settings TO service_role;

-- --------------------------------------------------------------------------
-- 4.17 Function grants
-- --------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_translation TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessibility_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_captions TO authenticated;
GRANT EXECUTE ON FUNCTION check_lesson_prerequisites TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_learning_path_progress TO authenticated;
GRANT EXECUTE ON FUNCTION update_student_competency TO authenticated;
GRANT EXECUTE ON FUNCTION sync_student_calendar_from_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION sync_student_todos_from_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION generate_group_join_code TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_todos TO authenticated;
GRANT EXECUTE ON FUNCTION compute_survey_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION compute_survey_analytics TO service_role;
GRANT EXECUTE ON FUNCTION get_category_path TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_descendants TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ai_usage_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_ai_context() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_usage(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_score TO authenticated;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_tenant_id() TO anon;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO service_role;


-- ############################################################################
-- SECTION 5: REFRESH SCHEMA CACHE
-- ############################################################################

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================
