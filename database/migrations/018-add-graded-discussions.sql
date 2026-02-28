-- Migration: 018-add-graded-discussions.sql
-- Adds grading support to course discussions

-- 1. Add grading columns to course_discussions table
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT false;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS points INTEGER;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS rubric JSONB;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS grading_criteria TEXT;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS min_replies INTEGER DEFAULT 0;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS min_words INTEGER DEFAULT 0;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS show_in_curriculum BOOLEAN DEFAULT false;
ALTER TABLE course_discussions ADD COLUMN IF NOT EXISTS curriculum_order INTEGER;

-- 2. Create discussion participation grades table
CREATE TABLE IF NOT EXISTS discussion_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_posts INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    rubric_scores JSONB,
    score INTEGER,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    feedback TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, student_id)
);

-- 3. Create discussion rubric templates table
CREATE TABLE IF NOT EXISTS discussion_rubric_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rubric JSONB NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update course_grade_items type check to include 'discussion'
-- First drop the existing constraint
ALTER TABLE course_grade_items DROP CONSTRAINT IF EXISTS course_grade_items_type_check;

-- Add the new constraint with 'discussion' type
ALTER TABLE course_grade_items ADD CONSTRAINT course_grade_items_type_check
    CHECK (type IN ('quiz', 'assignment', 'discussion', 'other'));

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_discussions_is_graded ON course_discussions(is_graded) WHERE is_graded = true;
CREATE INDEX IF NOT EXISTS idx_course_discussions_due_date ON course_discussions(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_discussions_curriculum ON course_discussions(course_id, show_in_curriculum) WHERE show_in_curriculum = true;
CREATE INDEX IF NOT EXISTS idx_discussion_grades_discussion ON discussion_grades(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_grades_student ON discussion_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_discussion_grades_course ON discussion_grades(course_id);

-- 6. Enable RLS on new tables
ALTER TABLE discussion_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_rubric_templates ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for discussion_grades
CREATE POLICY "Students can view own discussion grades" ON discussion_grades
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Instructors can manage discussion grades" ON discussion_grades
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = discussion_grades.course_id
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer', 'instructor')
        )
    );

-- 8. RLS Policies for discussion_rubric_templates
CREATE POLICY "Anyone can view rubric templates" ON discussion_rubric_templates
    FOR SELECT USING (true);

CREATE POLICY "Instructors can create rubric templates" ON discussion_rubric_templates
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer', 'instructor')
        )
    );

CREATE POLICY "Template creators can update their templates" ON discussion_rubric_templates
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Template creators can delete their templates" ON discussion_rubric_templates
    FOR DELETE USING (
        (created_by = auth.uid() AND is_system = false) OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- 9. Insert default discussion rubric templates
INSERT INTO discussion_rubric_templates (name, description, rubric, is_system) VALUES
(
    'Standard Discussion Rubric',
    'General-purpose rubric for grading discussion participation',
    '[
        {
            "id": "quality",
            "criteria": "Quality of Initial Post",
            "levels": [
                {"name": "Excellent", "description": "Demonstrates thorough understanding with original insights and critical analysis", "points": 25},
                {"name": "Good", "description": "Shows good understanding with relevant supporting points", "points": 20},
                {"name": "Satisfactory", "description": "Meets basic requirements but lacks depth", "points": 15},
                {"name": "Needs Improvement", "description": "Minimal effort, missing key elements", "points": 10}
            ]
        },
        {
            "id": "engagement",
            "criteria": "Engagement with Peers",
            "levels": [
                {"name": "Excellent", "description": "Multiple substantive replies that extend the discussion", "points": 25},
                {"name": "Good", "description": "Meaningful replies that add value", "points": 20},
                {"name": "Satisfactory", "description": "Basic replies with minimal engagement", "points": 15},
                {"name": "Needs Improvement", "description": "Few or superficial replies", "points": 10}
            ]
        },
        {
            "id": "evidence",
            "criteria": "Use of Evidence/Sources",
            "levels": [
                {"name": "Excellent", "description": "Strong use of relevant sources and course materials", "points": 25},
                {"name": "Good", "description": "Good use of sources with proper references", "points": 20},
                {"name": "Satisfactory", "description": "Some use of sources", "points": 15},
                {"name": "Needs Improvement", "description": "Little to no supporting evidence", "points": 10}
            ]
        },
        {
            "id": "communication",
            "criteria": "Writing Quality",
            "levels": [
                {"name": "Excellent", "description": "Clear, well-organized, professional writing", "points": 25},
                {"name": "Good", "description": "Generally clear with minor issues", "points": 20},
                {"name": "Satisfactory", "description": "Understandable but needs improvement", "points": 15},
                {"name": "Needs Improvement", "description": "Difficult to follow, many errors", "points": 10}
            ]
        }
    ]'::jsonb,
    true
),
(
    'Peer Learning Rubric',
    'Focused on collaborative learning and peer support',
    '[
        {
            "id": "contribution",
            "criteria": "Original Contribution",
            "levels": [
                {"name": "Excellent", "description": "Brings unique perspectives and advances understanding", "points": 30},
                {"name": "Good", "description": "Contributes relevant ideas", "points": 24},
                {"name": "Satisfactory", "description": "Basic contribution", "points": 18},
                {"name": "Needs Improvement", "description": "Minimal contribution", "points": 10}
            ]
        },
        {
            "id": "collaboration",
            "criteria": "Collaborative Spirit",
            "levels": [
                {"name": "Excellent", "description": "Actively helps peers, builds on others ideas respectfully", "points": 40},
                {"name": "Good", "description": "Good interaction with peers", "points": 32},
                {"name": "Satisfactory", "description": "Some interaction", "points": 24},
                {"name": "Needs Improvement", "description": "Limited interaction", "points": 12}
            ]
        },
        {
            "id": "timeliness",
            "criteria": "Timely Participation",
            "levels": [
                {"name": "Excellent", "description": "Posts early and responds throughout discussion period", "points": 30},
                {"name": "Good", "description": "Posts on time with follow-up", "points": 24},
                {"name": "Satisfactory", "description": "Meets minimum timing requirements", "points": 18},
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

-- 10. Create function to auto-create gradebook entry for graded discussions
CREATE OR REPLACE FUNCTION create_discussion_grade_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create grade item if discussion is graded and points are set
    IF NEW.is_graded = true AND NEW.points IS NOT NULL AND NEW.points > 0 THEN
        -- Check if grade item already exists
        IF NOT EXISTS (
            SELECT 1 FROM course_grade_items
            WHERE assessment_id = NEW.id AND type = 'discussion'
        ) THEN
            INSERT INTO course_grade_items (
                course_id,
                title,
                type,
                category,
                points,
                assessment_id,
                due_date
            ) VALUES (
                NEW.course_id,
                'Discussion: ' || NEW.title,
                'discussion',
                'Discussions',
                NEW.points,
                NEW.id,
                NEW.due_date
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for auto-creating grade items
DROP TRIGGER IF EXISTS create_discussion_grade_item_trigger ON course_discussions;
CREATE TRIGGER create_discussion_grade_item_trigger
    AFTER INSERT OR UPDATE OF is_graded, points, due_date ON course_discussions
    FOR EACH ROW
    EXECUTE FUNCTION create_discussion_grade_item();

-- 12. Create function to sync discussion grades to gradebook
CREATE OR REPLACE FUNCTION sync_discussion_grade_to_gradebook()
RETURNS TRIGGER AS $$
DECLARE
    grade_item_id UUID;
BEGIN
    -- Find the corresponding grade item
    SELECT id INTO grade_item_id
    FROM course_grade_items
    WHERE assessment_id = NEW.discussion_id AND type = 'discussion';

    -- If grade item exists, upsert the grade
    IF grade_item_id IS NOT NULL AND NEW.score IS NOT NULL THEN
        INSERT INTO course_grades (
            course_id,
            student_id,
            grade_item_id,
            score,
            max_score,
            percentage,
            feedback,
            graded_by,
            graded_at
        ) VALUES (
            NEW.course_id,
            NEW.student_id,
            grade_item_id,
            NEW.score,
            NEW.max_score,
            NEW.percentage,
            NEW.feedback,
            NEW.graded_by,
            NEW.graded_at
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

-- 13. Create trigger to sync discussion grades
DROP TRIGGER IF EXISTS sync_discussion_grade_trigger ON discussion_grades;
CREATE TRIGGER sync_discussion_grade_trigger
    AFTER INSERT OR UPDATE OF score, feedback ON discussion_grades
    FOR EACH ROW
    EXECUTE FUNCTION sync_discussion_grade_to_gradebook();
