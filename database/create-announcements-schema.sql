-- Course Announcements Schema
-- Creates a dedicated announcements feature separate from discussions

-- 1. Create course_announcements table
CREATE TABLE IF NOT EXISTS course_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    attachment_url VARCHAR(500), -- Optional file attachment
    attachment_name VARCHAR(255), -- Original filename
    scheduled_for TIMESTAMPTZ, -- Optional scheduled publishing
    expires_at TIMESTAMPTZ, -- Optional expiration date
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_id ON course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_author_id ON course_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_created_at ON course_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_announcements_is_pinned ON course_announcements(is_pinned);
CREATE INDEX IF NOT EXISTS idx_course_announcements_scheduled ON course_announcements(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- 3. Create announcement views tracking (who has seen what)
CREATE TABLE IF NOT EXISTS announcement_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES course_announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON announcement_views(user_id);

-- 4. Enable Row Level Security
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for course_announcements

-- Students can view announcements for courses they're enrolled in
CREATE POLICY "Students can view announcements for enrolled courses" ON course_announcements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = course_announcements.course_id
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = course_announcements.course_id
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Instructors can create announcements for their courses
CREATE POLICY "Instructors can create announcements" ON course_announcements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = course_announcements.course_id
            AND ci.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Instructors can update their own announcements
CREATE POLICY "Instructors can update announcements" ON course_announcements
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = course_announcements.course_id
            AND ci.instructor_id = auth.uid()
        )
        OR author_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Instructors can delete announcements
CREATE POLICY "Instructors can delete announcements" ON course_announcements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = course_announcements.course_id
            AND ci.instructor_id = auth.uid()
        )
        OR author_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 6. RLS Policies for announcement_views

-- Users can view their own views
CREATE POLICY "Users can view their own announcement views" ON announcement_views
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own views
CREATE POLICY "Users can create announcement views" ON announcement_views
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to auto-update updated_at
CREATE TRIGGER update_course_announcements_updated_at
    BEFORE UPDATE ON course_announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_updated_at();

-- 9. Comments
COMMENT ON TABLE course_announcements IS 'Course announcements separate from discussions';
COMMENT ON TABLE announcement_views IS 'Tracks which users have viewed which announcements';

