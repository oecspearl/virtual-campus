-- Create Course-Based Gradebook Schema
-- This script creates gradebook tables that work with courses instead of classes

-- 1. Create course_grade_items table (replaces grade_items with course_id)
CREATE TABLE IF NOT EXISTS course_grade_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('quiz', 'assignment', 'other')),
    category VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    assessment_id UUID, -- references quiz or assignment
    due_date TIMESTAMP WITH TIME ZONE,
    weight DECIMAL(5,2) DEFAULT 1.0, -- weight for calculating final grade
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create course_grades table (replaces grades with course_id)
CREATE TABLE IF NOT EXISTS course_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_item_id UUID NOT NULL REFERENCES course_grade_items(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, grade_item_id)
);

-- 3. Create course_gradebook_settings table for course-specific gradebook configuration
CREATE TABLE IF NOT EXISTS course_gradebook_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    grading_scheme VARCHAR(20) DEFAULT 'points' CHECK (grading_scheme IN ('points', 'percentage', 'letter')),
    categories JSONB DEFAULT '[]'::jsonb, -- array of category objects with name, weight, etc.
    total_points INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_grade_items_course_id ON course_grade_items(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grade_items_type ON course_grade_items(type);
CREATE INDEX IF NOT EXISTS idx_course_grade_items_category ON course_grade_items(category);

CREATE INDEX IF NOT EXISTS idx_course_grades_course_id ON course_grades(course_id);
CREATE INDEX IF NOT EXISTS idx_course_grades_student_id ON course_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_course_grades_grade_item_id ON course_grades(grade_item_id);

CREATE INDEX IF NOT EXISTS idx_course_gradebook_settings_course_id ON course_gradebook_settings(course_id);

-- 5. Enable RLS
ALTER TABLE course_grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_gradebook_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for course_grade_items
CREATE POLICY "Course instructors can manage grade items" ON course_grade_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = course_grade_items.course_id 
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 7. Create RLS policies for course_grades
CREATE POLICY "Students can view their own grades" ON course_grades
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Course instructors can manage grades" ON course_grades
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = course_grades.course_id 
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 8. Create RLS policies for course_gradebook_settings
CREATE POLICY "Course instructors can manage gradebook settings" ON course_gradebook_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = course_gradebook_settings.course_id 
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 9. Create a function to automatically create gradebook settings for new courses
CREATE OR REPLACE FUNCTION create_default_gradebook_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO course_gradebook_settings (course_id, grading_scheme, total_points)
    VALUES (NEW.id, 'points', 1000);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically create gradebook settings for new courses
CREATE TRIGGER create_gradebook_settings_trigger
    AFTER INSERT ON courses
    FOR EACH ROW
    EXECUTE FUNCTION create_default_gradebook_settings();

-- 11. Show the created tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('course_grade_items', 'course_grades', 'course_gradebook_settings')
ORDER BY table_name, ordinal_position;
