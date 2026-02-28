-- Migration: 006-add-learning-pathways.sql
-- Description: Add learning pathways, prerequisites, competencies, and adaptive learning
-- Created: 2024

-- ============================================================================
-- LESSON PREREQUISITES
-- ============================================================================

-- Add prerequisite fields to lessons table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lessons' AND column_name = 'prerequisite_lesson_id') THEN
        ALTER TABLE lessons ADD COLUMN prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lessons' AND column_name = 'prerequisite_type') THEN
        ALTER TABLE lessons ADD COLUMN prerequisite_type VARCHAR(20) DEFAULT 'completion'
            CHECK (prerequisite_type IN ('completion', 'quiz_pass', 'assignment_pass'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lessons' AND column_name = 'prerequisite_min_score') THEN
        ALTER TABLE lessons ADD COLUMN prerequisite_min_score INTEGER;
    END IF;
END
$$;

-- Create index for prerequisite lookups
CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite ON lessons(prerequisite_lesson_id);

-- ============================================================================
-- LEARNING PATHS (Course Sequences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration VARCHAR(50),  -- e.g., "8 weeks", "20 hours"
    published BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses within a learning path
CREATE TABLE IF NOT EXISTS learning_path_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    unlock_after_previous BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(learning_path_id, course_id)
);

-- Student enrollments in learning paths
CREATE TABLE IF NOT EXISTS learning_path_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    UNIQUE(learning_path_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path ON learning_path_courses(learning_path_id, "order");
CREATE INDEX IF NOT EXISTS idx_learning_path_enrollments_student ON learning_path_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_published ON learning_paths(published, featured);

-- ============================================================================
-- COMPETENCIES (Skills/Learning Outcomes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- 'technical', 'soft-skills', 'domain-specific'
    parent_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 5),  -- 1-5 proficiency levels
    icon VARCHAR(50),  -- Icon name for UI
    color VARCHAR(20),  -- Color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link courses to competencies they teach
CREATE TABLE IF NOT EXISTS course_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    is_primary BOOLEAN DEFAULT false,  -- Primary vs secondary competency
    weight DECIMAL(3,2) DEFAULT 1.0,   -- How much this course contributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, competency_id)
);

-- Link lessons to competencies
CREATE TABLE IF NOT EXISTS lesson_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lesson_id, competency_id)
);

-- Track student competency levels
CREATE TABLE IF NOT EXISTS student_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE,
    current_level DECIMAL(3,2) DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 5),
    evidence JSONB DEFAULT '[]',  -- [{source: 'lesson', id: 'x', score: 85, date: '...'}]
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, competency_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competencies_category ON competencies(category);
CREATE INDEX IF NOT EXISTS idx_competencies_parent ON competencies(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_competencies_course ON course_competencies(course_id);
CREATE INDEX IF NOT EXISTS idx_course_competencies_competency ON course_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_lesson_competencies_lesson ON lesson_competencies(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_competencies_student ON student_competencies(student_id);

-- ============================================================================
-- ADAPTIVE LEARNING RULES
-- ============================================================================

-- Rules for adaptive content recommendations based on quiz performance
CREATE TABLE IF NOT EXISTS adaptive_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,  -- Optional: apply to all quizzes in course
    condition_type VARCHAR(50) NOT NULL,  -- 'score_range', 'question_tag', 'time_taken', 'attempts'
    condition_value JSONB NOT NULL,       -- {min: 0, max: 50} or {tag: 'algebra'} or {max_minutes: 10}
    action_type VARCHAR(50) NOT NULL,     -- 'recommend_lesson', 'unlock_path', 'assign_content', 'show_message'
    action_target UUID,                   -- lesson_id, learning_path_id, etc.
    action_data JSONB,                    -- Additional action parameters
    priority INTEGER DEFAULT 0,           -- Higher priority rules evaluated first
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track recommendations generated for students
CREATE TABLE IF NOT EXISTS student_adaptive_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES adaptive_rules(id) ON DELETE SET NULL,
    quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
    recommendation_type VARCHAR(50) NOT NULL,  -- 'lesson', 'path', 'content', 'message'
    target_id UUID,
    target_title VARCHAR(255),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_adaptive_rules_quiz ON adaptive_rules(quiz_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_rules_course ON adaptive_rules(course_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_rules_active ON adaptive_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_student_adaptive_recs_student ON student_adaptive_recommendations(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_adaptive_recs_target ON student_adaptive_recommendations(target_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Learning Paths
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published learning paths" ON learning_paths;
CREATE POLICY "Anyone can view published learning paths"
ON learning_paths FOR SELECT
USING (published = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

DROP POLICY IF EXISTS "Admins can manage learning paths" ON learning_paths;
CREATE POLICY "Admins can manage learning paths"
ON learning_paths FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- Learning Path Courses
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view learning path courses" ON learning_path_courses;
CREATE POLICY "Anyone can view learning path courses"
ON learning_path_courses FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage learning path courses" ON learning_path_courses;
CREATE POLICY "Admins can manage learning path courses"
ON learning_path_courses FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- Learning Path Enrollments
ALTER TABLE learning_path_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can view own path enrollments"
ON learning_path_enrollments FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Users can manage own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can manage own path enrollments"
ON learning_path_enrollments FOR ALL
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
));

-- Competencies
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view competencies" ON competencies;
CREATE POLICY "Anyone can view competencies"
ON competencies FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage competencies" ON competencies;
CREATE POLICY "Admins can manage competencies"
ON competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
));

-- Course/Lesson Competencies
ALTER TABLE course_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course competencies" ON course_competencies;
CREATE POLICY "Anyone can view course competencies"
ON course_competencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage course competencies" ON course_competencies;
CREATE POLICY "Admins can manage course competencies"
ON course_competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

DROP POLICY IF EXISTS "Anyone can view lesson competencies" ON lesson_competencies;
CREATE POLICY "Anyone can view lesson competencies"
ON lesson_competencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage lesson competencies" ON lesson_competencies;
CREATE POLICY "Admins can manage lesson competencies"
ON lesson_competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- Student Competencies
ALTER TABLE student_competencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own competencies" ON student_competencies;
CREATE POLICY "Users can view own competencies"
ON student_competencies FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "System can manage student competencies" ON student_competencies;
CREATE POLICY "System can manage student competencies"
ON student_competencies FOR ALL
USING (true);  -- Managed by system triggers

-- Adaptive Rules
ALTER TABLE adaptive_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active adaptive rules" ON adaptive_rules;
CREATE POLICY "Anyone can view active adaptive rules"
ON adaptive_rules FOR SELECT
USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Instructors can manage adaptive rules" ON adaptive_rules;
CREATE POLICY "Instructors can manage adaptive rules"
ON adaptive_rules FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

-- Student Recommendations
ALTER TABLE student_adaptive_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can view own recommendations"
ON student_adaptive_recommendations FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Users can update own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can update own recommendations"
ON student_adaptive_recommendations FOR UPDATE
USING (student_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if lesson prerequisites are met
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
    -- Get lesson with prerequisites
    SELECT l.*, prereq.title as prereq_title
    INTO v_lesson
    FROM lessons l
    LEFT JOIN lessons prereq ON l.prerequisite_lesson_id = prereq.id
    WHERE l.id = p_lesson_id;

    -- If no prerequisite, lesson is unlocked
    IF v_lesson.prerequisite_lesson_id IS NULL THEN
        RETURN jsonb_build_object('unlocked', true, 'reason', null, 'prerequisite', null);
    END IF;

    -- Check based on prerequisite type
    IF v_lesson.prerequisite_type = 'completion' THEN
        SELECT status INTO v_prereq_status
        FROM lesson_progress
        WHERE student_id = p_student_id AND lesson_id = v_lesson.prerequisite_lesson_id;

        IF v_prereq_status.status != 'completed' THEN
            v_is_unlocked := false;
            v_reason := 'Complete "' || v_lesson.prereq_title || '" first';
        END IF;

    ELSIF v_lesson.prerequisite_type = 'quiz_pass' THEN
        -- Check if student passed a quiz in the prerequisite lesson
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
        -- Check if student completed an assignment in the prerequisite lesson
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

-- Function to calculate learning path progress
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
    -- Count total required courses
    SELECT COUNT(*) INTO v_total_courses
    FROM learning_path_courses
    WHERE learning_path_id = p_learning_path_id AND is_required = true;

    IF v_total_courses = 0 THEN
        RETURN 0;
    END IF;

    -- Count completed courses
    SELECT COUNT(*) INTO v_completed_courses
    FROM learning_path_courses lpc
    JOIN enrollments e ON e.course_id = lpc.course_id
    WHERE lpc.learning_path_id = p_learning_path_id
      AND lpc.is_required = true
      AND e.student_id = p_student_id
      AND e.status = 'completed';

    v_progress := (v_completed_courses * 100) / v_total_courses;

    -- Update enrollment progress
    UPDATE learning_path_enrollments
    SET progress_percentage = v_progress,
        completed_at = CASE WHEN v_progress = 100 THEN NOW() ELSE NULL END,
        status = CASE WHEN v_progress = 100 THEN 'completed' ELSE status END
    WHERE student_id = p_student_id AND learning_path_id = p_learning_path_id;

    RETURN v_progress;
END;
$$;

-- Function to update student competency level
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
    -- Get current level and evidence
    SELECT current_level, evidence
    INTO v_current_level, v_evidence
    FROM student_competencies
    WHERE student_id = p_student_id AND competency_id = p_competency_id;

    -- Initialize if not exists
    IF v_current_level IS NULL THEN
        v_current_level := 0;
        v_evidence := '[]'::jsonb;
    END IF;

    -- Add new evidence
    v_evidence := v_evidence || jsonb_build_object(
        'source', p_source_type,
        'id', p_source_id,
        'score', p_score,
        'date', NOW()
    );

    -- Calculate new level (weighted average of recent scores, capped at 5)
    v_new_level := LEAST(5, (v_current_level + (p_score / 20)) / 2);

    -- Upsert student competency
    INSERT INTO student_competencies (student_id, competency_id, current_level, evidence, updated_at)
    VALUES (p_student_id, p_competency_id, v_new_level, v_evidence, NOW())
    ON CONFLICT (student_id, competency_id) DO UPDATE SET
        current_level = EXCLUDED.current_level,
        evidence = EXCLUDED.evidence,
        updated_at = NOW();
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update learning path timestamps
DROP TRIGGER IF EXISTS learning_paths_updated_at ON learning_paths;
CREATE TRIGGER learning_paths_updated_at
    BEFORE UPDATE ON learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- Update competencies timestamps
DROP TRIGGER IF EXISTS competencies_updated_at ON competencies;
CREATE TRIGGER competencies_updated_at
    BEFORE UPDATE ON competencies
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- Update adaptive rules timestamps
DROP TRIGGER IF EXISTS adaptive_rules_updated_at ON adaptive_rules;
CREATE TRIGGER adaptive_rules_updated_at
    BEFORE UPDATE ON adaptive_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample competencies
INSERT INTO competencies (id, name, description, category, level)
VALUES
    (uuid_generate_v4(), 'Critical Thinking', 'Ability to analyze information objectively', 'soft-skills', 1),
    (uuid_generate_v4(), 'Problem Solving', 'Ability to find solutions to difficult issues', 'soft-skills', 1),
    (uuid_generate_v4(), 'Communication', 'Ability to convey information effectively', 'soft-skills', 1),
    (uuid_generate_v4(), 'Digital Literacy', 'Understanding and using digital technologies', 'technical', 1),
    (uuid_generate_v4(), 'Data Analysis', 'Ability to interpret and analyze data', 'technical', 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE learning_paths IS 'Structured sequences of courses for guided learning';
COMMENT ON TABLE learning_path_courses IS 'Courses within a learning path with ordering';
COMMENT ON TABLE learning_path_enrollments IS 'Student enrollments in learning paths';
COMMENT ON TABLE competencies IS 'Skills and learning outcomes that can be developed';
COMMENT ON TABLE course_competencies IS 'Links courses to competencies they develop';
COMMENT ON TABLE student_competencies IS 'Tracks student progress in each competency';
COMMENT ON TABLE adaptive_rules IS 'Rules for recommending content based on performance';
COMMENT ON TABLE student_adaptive_recommendations IS 'Personalized recommendations for students';
COMMENT ON FUNCTION check_lesson_prerequisites IS 'Checks if a student has met lesson prerequisites';
COMMENT ON FUNCTION calculate_learning_path_progress IS 'Calculates student progress through a learning path';
COMMENT ON FUNCTION update_student_competency IS 'Updates student competency level based on activity';
