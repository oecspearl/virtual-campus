-- Create lesson_progress table for tracking student progress through course lessons
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0, -- in seconds
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON lesson_progress(status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_at ON lesson_progress(completed_at);

-- Create RLS policies
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view and update their own progress
CREATE POLICY "Students can view own progress" ON lesson_progress
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can update own progress" ON lesson_progress
    FOR ALL USING (student_id = auth.uid());

-- Policy: Instructors and admins can view all progress
CREATE POLICY "Instructors can view all progress" ON lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy: Instructors and admins can update all progress
CREATE POLICY "Instructors can update all progress" ON lesson_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );
