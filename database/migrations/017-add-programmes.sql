-- Migration: Add Programmes (Learning Paths with Grade Aggregation)
-- Programmes group multiple courses together with weighted grade aggregation
-- Programmes can be tagged with multiple categories for browsing

-- Programmes table
CREATE TABLE IF NOT EXISTS programmes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    thumbnail VARCHAR(500),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration VARCHAR(100),
    passing_score DECIMAL(5,2) DEFAULT 70.00,
    published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses within a programme (with order and weight)
CREATE TABLE IF NOT EXISTS programme_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    weight DECIMAL(5,2) DEFAULT 1.00,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(programme_id, course_id)
);

-- Programme category assignments (many-to-many with categories)
CREATE TABLE IF NOT EXISTS programme_category_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(programme_id, category_id)
);

-- Student enrollment in programmes
CREATE TABLE IF NOT EXISTS programme_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    final_score DECIMAL(5,2),
    certificate_issued BOOLEAN DEFAULT false,
    certificate_id UUID REFERENCES certificates(id),
    UNIQUE(programme_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_programmes_slug ON programmes(slug);
CREATE INDEX IF NOT EXISTS idx_programmes_published ON programmes(published);
CREATE INDEX IF NOT EXISTS idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_courses_course ON programme_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_programme_category_assignments_programme ON programme_category_assignments(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_category_assignments_category ON programme_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_programme ON programme_enrollments(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_student ON programme_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_programme_enrollments_status ON programme_enrollments(status);

-- Enable RLS
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programmes
CREATE POLICY "Published programmes are viewable by everyone" ON programmes
    FOR SELECT USING (published = true);

CREATE POLICY "Staff can view all programmes" ON programmes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

CREATE POLICY "Staff can manage programmes" ON programmes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
    );

-- RLS Policies for programme_courses
CREATE POLICY "Programme courses viewable with programme" ON programme_courses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM programmes WHERE programmes.id = programme_courses.programme_id AND programmes.published = true)
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                   AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

CREATE POLICY "Staff can manage programme courses" ON programme_courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
    );

-- RLS Policies for programme_category_assignments
CREATE POLICY "Programme categories viewable by all" ON programme_category_assignments
    FOR SELECT USING (true);

CREATE POLICY "Staff can manage programme categories" ON programme_category_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin', 'curriculum_designer'))
    );

-- RLS Policies for programme_enrollments
CREATE POLICY "Students can view own enrollments" ON programme_enrollments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Staff can view all enrollments" ON programme_enrollments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin'))
    );

CREATE POLICY "Students can enroll themselves" ON programme_enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Staff can manage enrollments" ON programme_enrollments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                AND users.role IN ('admin', 'super_admin'))
    );

-- Function to calculate programme final score for a student
CREATE OR REPLACE FUNCTION calculate_programme_score(p_programme_id UUID, p_student_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_weighted_score DECIMAL(10,4) := 0;
    total_weight DECIMAL(10,4) := 0;
    course_record RECORD;
    course_grade DECIMAL(5,2);
BEGIN
    -- Loop through all required courses in the programme
    FOR course_record IN
        SELECT pc.course_id, pc.weight, pc.is_required
        FROM programme_courses pc
        WHERE pc.programme_id = p_programme_id
    LOOP
        -- Get the student's grade for this course (from enrollments or course_grades)
        SELECT COALESCE(
            (SELECT AVG(cg.score)
             FROM course_grades cg
             WHERE cg.course_id = course_record.course_id
             AND cg.student_id = p_student_id),
            (SELECT e.progress_percentage
             FROM enrollments e
             WHERE e.course_id = course_record.course_id
             AND e.student_id = p_student_id)
        ) INTO course_grade;

        -- If required course has no grade, return NULL (incomplete)
        IF course_record.is_required AND course_grade IS NULL THEN
            RETURN NULL;
        END IF;

        -- Add to weighted total
        IF course_grade IS NOT NULL THEN
            total_weighted_score := total_weighted_score + (course_grade * course_record.weight);
            total_weight := total_weight + course_record.weight;
        END IF;
    END LOOP;

    -- Calculate weighted average
    IF total_weight > 0 THEN
        RETURN ROUND(total_weighted_score / total_weight, 2);
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if student has completed all required courses
CREATE OR REPLACE FUNCTION check_programme_completion(p_programme_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    required_courses INTEGER;
    completed_courses INTEGER;
BEGIN
    -- Count required courses
    SELECT COUNT(*) INTO required_courses
    FROM programme_courses
    WHERE programme_id = p_programme_id AND is_required = true;

    -- Count completed courses (enrolled with status 'completed' or progress >= 100)
    SELECT COUNT(*) INTO completed_courses
    FROM programme_courses pc
    JOIN enrollments e ON e.course_id = pc.course_id AND e.student_id = p_student_id
    WHERE pc.programme_id = p_programme_id
    AND pc.is_required = true
    AND (e.status = 'completed' OR e.progress_percentage >= 100);

    RETURN completed_courses >= required_courses;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-enroll student in programme courses when they enroll in a programme
CREATE OR REPLACE FUNCTION auto_enroll_programme_courses()
RETURNS TRIGGER AS $$
BEGIN
    -- Enroll student in all programme courses they're not already enrolled in
    INSERT INTO enrollments (student_id, course_id, status)
    SELECT NEW.student_id, pc.course_id, 'active'
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

CREATE TRIGGER trg_auto_enroll_programme_courses
    AFTER INSERT ON programme_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_programme_courses();

-- Trigger to update programme enrollment when course is completed
CREATE OR REPLACE FUNCTION update_programme_on_course_completion()
RETURNS TRIGGER AS $$
DECLARE
    prog_record RECORD;
    new_score DECIMAL(5,2);
    is_complete BOOLEAN;
    prog_passing_score DECIMAL(5,2);
BEGIN
    -- Check if the completed course is part of any programme the student is enrolled in
    FOR prog_record IN
        SELECT pe.id, pe.programme_id, p.passing_score
        FROM programme_enrollments pe
        JOIN programmes p ON p.id = pe.programme_id
        JOIN programme_courses pc ON pc.programme_id = pe.programme_id
        WHERE pe.student_id = NEW.student_id
        AND pc.course_id = NEW.course_id
        AND pe.status = 'active'
    LOOP
        -- Calculate new score
        new_score := calculate_programme_score(prog_record.programme_id, NEW.student_id);

        -- Check completion
        is_complete := check_programme_completion(prog_record.programme_id, NEW.student_id);

        -- Update programme enrollment
        UPDATE programme_enrollments
        SET
            final_score = new_score,
            status = CASE WHEN is_complete AND new_score >= prog_record.passing_score THEN 'completed' ELSE status END,
            completed_at = CASE WHEN is_complete AND new_score >= prog_record.passing_score THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE id = prog_record.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger fires when enrollment status or progress changes
-- You may need to call this manually or add additional triggers based on your grading system

-- Add updated_at column to programme_enrollments if needed
ALTER TABLE programme_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON TABLE programmes IS 'Programmes group multiple courses with weighted grade aggregation';
COMMENT ON TABLE programme_courses IS 'Courses within a programme with order and weight for grade calculation';
COMMENT ON TABLE programme_category_assignments IS 'Many-to-many relationship between programmes and categories';
COMMENT ON TABLE programme_enrollments IS 'Student enrollment in programmes with aggregated final score';
COMMENT ON FUNCTION calculate_programme_score IS 'Calculates weighted average score across all programme courses';
COMMENT ON FUNCTION check_programme_completion IS 'Checks if student has completed all required courses in programme';
