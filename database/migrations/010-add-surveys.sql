-- Migration: 010-add-surveys.sql
-- Survey/Course Evaluation Feature
-- Run this migration after 009-add-enrollment-cleanup.sql

-- ================================================================
-- SURVEYS TABLE (parallel to quizzes)
-- ================================================================

CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    survey_type VARCHAR(50) DEFAULT 'course_evaluation'
        CHECK (survey_type IN ('course_evaluation', 'lesson_feedback', 'instructor_evaluation', 'nps', 'custom')),
    is_anonymous BOOLEAN DEFAULT true,
    allow_multiple_responses BOOLEAN DEFAULT false,
    available_from TIMESTAMP WITH TIME ZONE,
    available_until TIMESTAMP WITH TIME ZONE,
    randomize_questions BOOLEAN DEFAULT false,
    show_progress_bar BOOLEAN DEFAULT true,
    thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
    published BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SURVEY QUESTIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'likert_scale',      -- Agreement scale (1-5 or 1-7)
        'rating_scale',      -- Numeric rating (1-10)
        'multiple_choice',   -- Single selection
        'multiple_select',   -- Multi selection (checkboxes)
        'text',              -- Short text input
        'essay',             -- Long text input
        'matrix',            -- Grid of options
        'ranking',           -- Drag to rank items
        'nps',               -- Net Promoter Score (0-10)
        'slider'             -- Continuous slider
    )),
    question_text TEXT NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    required BOOLEAN DEFAULT true,
    options JSONB,
    -- For likert_scale: {min: 1, max: 5, labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}
    -- For rating_scale: {min: 1, max: 10, labels: {1: "Poor", 5: "Average", 10: "Excellent"}}
    -- For multiple_choice/multiple_select: [{id: "opt1", text: "Option 1"}]
    -- For matrix: {rows: [{id: "r1", text: "Topic 1"}], columns: [{id: "c1", text: "Poor"}, {id: "c2", text: "Average"}, {id: "c3", text: "Good"}]}
    -- For ranking: [{id: "item1", text: "Item to rank 1"}]
    -- For nps: {min: 0, max: 10}
    -- For slider: {min: 0, max: 100, step: 1, labels: {0: "Never", 50: "Sometimes", 100: "Always"}}
    -- For text: {maxLength: 500, placeholder: "Enter your response..."}
    -- For essay: {minLength: 50, maxLength: 2000}
    conditional_logic JSONB,
    -- {show_if: {question_id: "uuid", operator: "equals|not_equals|contains|greater_than|less_than", value: "any"}}
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SURVEY RESPONSES TABLE (parallel to quiz_attempts)
-- ================================================================

CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL if anonymous
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    answers JSONB DEFAULT '[]',
    -- [{question_id: "uuid", answer: <value>}]
    -- For likert_scale/rating_scale/nps/slider: number
    -- For multiple_choice: "option_id"
    -- For multiple_select: ["option_id1", "option_id2"]
    -- For text/essay: "string"
    -- For matrix: {"row_id1": "column_id", "row_id2": "column_id"}
    -- For ranking: ["option_id1", "option_id2"] (ordered by rank)
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
    completion_time INTEGER,  -- seconds taken to complete
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SURVEY ANALYTICS CACHE
-- ================================================================

CREATE TABLE IF NOT EXISTS survey_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL UNIQUE REFERENCES surveys(id) ON DELETE CASCADE,
    response_count INTEGER DEFAULT 0,
    completion_rate NUMERIC(5,2),
    avg_completion_time INTEGER,  -- seconds
    question_stats JSONB DEFAULT '{}',
    -- {
    --   "question_id": {
    --     response_count: number,
    --     mean: number (for numeric types),
    --     median: number,
    --     mode: string|number,
    --     distribution: {"value": count},
    --     text_responses: ["response1", "response2"] (for text types, limited to last 100)
    --   }
    -- }
    nps_score NUMERIC(5,2),  -- -100 to +100 for NPS type surveys
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SURVEY TEMPLATES
-- ================================================================

CREATE TABLE IF NOT EXISTS survey_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50),
    questions JSONB NOT NULL,
    -- Array of question objects matching survey_questions structure
    is_system BOOLEAN DEFAULT false,  -- System templates cannot be deleted
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_surveys_course ON surveys(course_id);
CREATE INDEX IF NOT EXISTS idx_surveys_lesson ON surveys(lesson_id);
CREATE INDEX IF NOT EXISTS idx_surveys_published ON surveys(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_surveys_creator ON surveys(creator_id);
CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(survey_type);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(survey_id, "order");

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_respondent ON survey_responses(respondent_id) WHERE respondent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_responses_status ON survey_responses(survey_id, status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses(submitted_at) WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS idx_survey_templates_system ON survey_templates(is_system) WHERE is_system = true;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

-- Surveys: Creators and admins can manage, students can view published
DROP POLICY IF EXISTS "Instructors can manage surveys" ON surveys;
CREATE POLICY "Instructors can manage surveys" ON surveys
    FOR ALL USING (
        creator_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
    );

DROP POLICY IF EXISTS "Students can view published surveys" ON surveys;
CREATE POLICY "Students can view published surveys" ON surveys
    FOR SELECT USING (published = true);

-- Questions: Same as surveys
DROP POLICY IF EXISTS "Instructors can manage survey questions" ON survey_questions;
CREATE POLICY "Instructors can manage survey questions" ON survey_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND (
            s.creator_id = auth.uid() OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
        ))
    );

DROP POLICY IF EXISTS "Students can view questions of published surveys" ON survey_questions;
CREATE POLICY "Students can view questions of published surveys" ON survey_questions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_questions.survey_id AND s.published = true)
    );

-- Responses: Students can manage own, instructors can view all
DROP POLICY IF EXISTS "Students can manage own responses" ON survey_responses;
CREATE POLICY "Students can manage own responses" ON survey_responses
    FOR ALL USING (respondent_id = auth.uid() OR respondent_id IS NULL);

DROP POLICY IF EXISTS "Instructors can view all responses" ON survey_responses;
CREATE POLICY "Instructors can view all responses" ON survey_responses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
    );

-- Analytics: Instructors only
DROP POLICY IF EXISTS "Instructors can view analytics" ON survey_analytics;
CREATE POLICY "Instructors can view analytics" ON survey_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer'))
    );

-- Templates: Anyone can view, only creators/admins can manage
DROP POLICY IF EXISTS "Anyone can view templates" ON survey_templates;
CREATE POLICY "Anyone can view templates" ON survey_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own templates" ON survey_templates;
CREATE POLICY "Creators can manage own templates" ON survey_templates
    FOR ALL USING (
        creator_id = auth.uid() OR is_system = false OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to compute survey analytics
CREATE OR REPLACE FUNCTION compute_survey_analytics(p_survey_id UUID)
RETURNS VOID AS $$
DECLARE
    v_response_count INTEGER;
    v_completed_count INTEGER;
    v_completion_rate NUMERIC;
    v_avg_time INTEGER;
    v_question_stats JSONB := '{}';
    v_nps_score NUMERIC;
    v_question RECORD;
    v_stats JSONB;
BEGIN
    -- Get response counts
    SELECT COUNT(*) INTO v_response_count
    FROM survey_responses
    WHERE survey_id = p_survey_id;

    SELECT COUNT(*) INTO v_completed_count
    FROM survey_responses
    WHERE survey_id = p_survey_id AND status = 'submitted';

    -- Calculate completion rate
    IF v_response_count > 0 THEN
        v_completion_rate := (v_completed_count::NUMERIC / v_response_count) * 100;
    ELSE
        v_completion_rate := 0;
    END IF;

    -- Calculate average completion time
    SELECT AVG(completion_time) INTO v_avg_time
    FROM survey_responses
    WHERE survey_id = p_survey_id AND status = 'submitted' AND completion_time IS NOT NULL;

    -- Calculate stats for each question (simplified - can be expanded)
    FOR v_question IN SELECT id, type FROM survey_questions WHERE survey_id = p_survey_id
    LOOP
        v_stats := jsonb_build_object('response_count', v_completed_count);
        v_question_stats := v_question_stats || jsonb_build_object(v_question.id::text, v_stats);
    END LOOP;

    -- Upsert analytics
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

-- Trigger to update analytics on response submission
CREATE OR REPLACE FUNCTION on_survey_response_submit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
        PERFORM compute_survey_analytics(NEW.survey_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS survey_response_submit_trigger ON survey_responses;
CREATE TRIGGER survey_response_submit_trigger
    AFTER INSERT OR UPDATE OF status ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION on_survey_response_submit();

-- ================================================================
-- INSERT SYSTEM TEMPLATES
-- ================================================================

INSERT INTO survey_templates (name, description, survey_type, questions, is_system, created_at)
VALUES
    (
        'Course Evaluation',
        'Comprehensive course evaluation covering content quality, instructor effectiveness, and overall satisfaction',
        'course_evaluation',
        '[
            {"type": "likert_scale", "question_text": "The course content was well-organized and easy to follow", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Content"},
            {"type": "likert_scale", "question_text": "The course materials were helpful and relevant", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Content"},
            {"type": "likert_scale", "question_text": "The difficulty level was appropriate", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Content"},
            {"type": "rating_scale", "question_text": "How would you rate the overall quality of this course?", "required": true, "options": {"min": 1, "max": 10, "labels": {"1": "Poor", "5": "Average", "10": "Excellent"}}, "category": "Overall"},
            {"type": "multiple_choice", "question_text": "Would you recommend this course to others?", "required": true, "options": [{"id": "yes", "text": "Yes, definitely"}, {"id": "probably", "text": "Yes, probably"}, {"id": "unsure", "text": "Not sure"}, {"id": "no", "text": "No"}], "category": "Overall"},
            {"type": "essay", "question_text": "What did you like most about this course?", "required": false, "options": {"minLength": 0, "maxLength": 1000}, "category": "Feedback"},
            {"type": "essay", "question_text": "What could be improved?", "required": false, "options": {"minLength": 0, "maxLength": 1000}, "category": "Feedback"}
        ]'::jsonb,
        true,
        NOW()
    ),
    (
        'Instructor Feedback',
        'Evaluate instructor teaching effectiveness, communication, and engagement',
        'instructor_evaluation',
        '[
            {"type": "likert_scale", "question_text": "The instructor explained concepts clearly", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Teaching"},
            {"type": "likert_scale", "question_text": "The instructor was responsive to questions", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Communication"},
            {"type": "likert_scale", "question_text": "The instructor created an engaging learning environment", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Engagement"},
            {"type": "likert_scale", "question_text": "The instructor provided helpful feedback", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Feedback"},
            {"type": "rating_scale", "question_text": "Rate the instructor overall", "required": true, "options": {"min": 1, "max": 10, "labels": {"1": "Poor", "5": "Average", "10": "Excellent"}}, "category": "Overall"},
            {"type": "text", "question_text": "Any additional comments for the instructor?", "required": false, "options": {"maxLength": 500}, "category": "Comments"}
        ]'::jsonb,
        true,
        NOW()
    ),
    (
        'Lesson Feedback',
        'Quick feedback on individual lesson content and delivery',
        'lesson_feedback',
        '[
            {"type": "likert_scale", "question_text": "This lesson was easy to understand", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Clarity"},
            {"type": "likert_scale", "question_text": "The lesson content was relevant to my learning goals", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Relevance"},
            {"type": "multiple_choice", "question_text": "How would you rate the difficulty of this lesson?", "required": true, "options": [{"id": "easy", "text": "Too Easy"}, {"id": "appropriate", "text": "Just Right"}, {"id": "difficult", "text": "Too Difficult"}], "category": "Difficulty"},
            {"type": "text", "question_text": "What could make this lesson better?", "required": false, "options": {"maxLength": 500}, "category": "Improvement"}
        ]'::jsonb,
        true,
        NOW()
    ),
    (
        'NPS Survey',
        'Net Promoter Score survey to measure student loyalty and satisfaction',
        'nps',
        '[
            {"type": "nps", "question_text": "How likely are you to recommend this course to a friend or colleague?", "required": true, "options": {"min": 0, "max": 10}, "category": "NPS"},
            {"type": "text", "question_text": "What is the primary reason for your score?", "required": false, "options": {"maxLength": 500}, "category": "Reason"}
        ]'::jsonb,
        true,
        NOW()
    ),
    (
        'End of Module Feedback',
        'Collect feedback at the end of each module or section',
        'lesson_feedback',
        '[
            {"type": "rating_scale", "question_text": "Rate your understanding of this module content", "required": true, "options": {"min": 1, "max": 5, "labels": {"1": "Very Low", "3": "Moderate", "5": "Very High"}}, "category": "Understanding"},
            {"type": "likert_scale", "question_text": "The module prepared me well for the next section", "required": true, "options": {"min": 1, "max": 5, "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]}, "category": "Preparation"},
            {"type": "multiple_select", "question_text": "Which aspects of this module were most helpful?", "required": false, "options": [{"id": "videos", "text": "Video content"}, {"id": "readings", "text": "Reading materials"}, {"id": "exercises", "text": "Practice exercises"}, {"id": "quizzes", "text": "Quizzes"}, {"id": "discussions", "text": "Discussions"}], "category": "Helpful"},
            {"type": "text", "question_text": "Any suggestions for improvement?", "required": false, "options": {"maxLength": 500}, "category": "Suggestions"}
        ]'::jsonb,
        true,
        NOW()
    )
ON CONFLICT DO NOTHING;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON surveys TO authenticated;
GRANT ALL ON survey_questions TO authenticated;
GRANT ALL ON survey_responses TO authenticated;
GRANT ALL ON survey_analytics TO authenticated;
GRANT ALL ON survey_templates TO authenticated;

GRANT EXECUTE ON FUNCTION compute_survey_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION compute_survey_analytics TO service_role;
