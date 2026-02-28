-- Fix Dashboard Tables Issues
-- This script addresses the missing columns and tables for dashboard functionality

-- 1. Add course_id column to assignments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE assignments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
    END IF;
END $$;

-- 2. Add published column to lesson_discussions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lesson_discussions' AND column_name = 'published'
    ) THEN
        ALTER TABLE lesson_discussions ADD COLUMN published BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Check if discussions table exists, if not create it
CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussions_course_id ON discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_author_id ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_published ON discussions(published);

-- 5. Update existing assignments to have course_id based on their lesson's course_id
UPDATE assignments 
SET course_id = lessons.course_id 
FROM lessons 
WHERE assignments.lesson_id = lessons.id 
AND assignments.course_id IS NULL;

-- 6. Enable RLS on new tables
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for discussions
DROP POLICY IF EXISTS "Students can view discussions for enrolled courses" ON discussions;
DROP POLICY IF EXISTS "Instructors can manage discussions for their courses" ON discussions;
DROP POLICY IF EXISTS "Admins can manage all discussions" ON discussions;

CREATE POLICY "Students can view discussions for enrolled courses" ON discussions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = discussions.course_id
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
    );

CREATE POLICY "Instructors can manage discussions for their courses" ON discussions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = discussions.course_id
            AND ci.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all discussions" ON discussions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- 8. Verify the fixes
SELECT 
    'Assignments Table Check' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('course_id', 'lesson_id', 'published')
ORDER BY column_name;

SELECT 
    'Lesson Discussions Table Check' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'lesson_discussions' 
AND column_name IN ('published', 'course_id')
ORDER BY column_name;

SELECT 
    'Discussions Table Check' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'discussions' 
ORDER BY column_name;
