-- Migration: 021-add-course-groups.sql
-- Add Course Groups support for group assignments

-- Course Groups table
CREATE TABLE IF NOT EXISTS course_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 5,
    allow_self_enrollment BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Group Members table
CREATE TABLE IF NOT EXISTS course_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, student_id)
);

-- Add group assignment fields to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_group_assignment BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS group_set_id UUID REFERENCES course_groups(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS one_submission_per_group BOOLEAN DEFAULT true;

-- Group submissions - tracks which group submitted
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES course_groups(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_groups_course ON course_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_course_group_members_group ON course_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_course_group_members_student ON course_group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group_set ON assignments(group_set_id) WHERE is_group_assignment = true;
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_group ON assignment_submissions(group_id) WHERE group_id IS NOT NULL;

-- Enable RLS
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_groups
CREATE POLICY "Instructors can manage course groups" ON course_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Students can view their course groups" ON course_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = course_groups.course_id
            AND e.student_id = auth.uid()
        )
    );

-- RLS Policies for course_group_members
CREATE POLICY "Instructors can manage group members" ON course_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Students can view their group members" ON course_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_group_members cgm2
            WHERE cgm2.group_id = course_group_members.group_id
            AND cgm2.student_id = auth.uid()
        )
    );

CREATE POLICY "Students can join groups with self-enrollment" ON course_group_members
    FOR INSERT WITH CHECK (
        student_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM course_groups cg
            WHERE cg.id = group_id AND cg.allow_self_enrollment = true
        )
    );

-- Add comments
COMMENT ON TABLE course_groups IS 'Groups within a course for collaborative assignments';
COMMENT ON TABLE course_group_members IS 'Members of course groups';
COMMENT ON COLUMN assignments.is_group_assignment IS 'When true, this is a group assignment where groups submit together';
COMMENT ON COLUMN assignments.group_set_id IS 'The group set to use for this assignment (if is_group_assignment is true)';
COMMENT ON COLUMN assignments.one_submission_per_group IS 'When true, only one submission per group is needed';
