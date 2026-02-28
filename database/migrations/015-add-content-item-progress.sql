-- Migration: 015-add-content-item-progress.sql
-- Add content-level progress tracking for individual content items within lessons

-- Create content_item_progress table
CREATE TABLE IF NOT EXISTS content_item_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    content_index INTEGER NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_title VARCHAR(255),
    content_id VARCHAR(255),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id, content_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_item_progress_student_lesson ON content_item_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_item_progress_completed ON content_item_progress(student_id, completed);

-- Enable Row Level Security
ALTER TABLE content_item_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Students can manage their own content progress
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'content_item_progress' AND policyname = 'Students can manage own content progress'
    ) THEN
        CREATE POLICY "Students can manage own content progress" ON content_item_progress
            FOR ALL USING (student_id = auth.uid());
    END IF;
END $$;

-- Policy: Instructors and admins can view all content progress
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'content_item_progress' AND policyname = 'Instructors can view all content progress'
    ) THEN
        CREATE POLICY "Instructors can view all content progress" ON content_item_progress
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON content_item_progress TO authenticated;
