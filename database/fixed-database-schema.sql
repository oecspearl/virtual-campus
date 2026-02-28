-- Fixed Database Schema for OECS LearnBoard LMS
-- Run this in Supabase SQL Editor to fix all missing tables and columns

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. First, add the missing course_id column to the lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- 2. Create lesson_progress table (the main missing table causing the error)
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- 3. Create course_discussions table
CREATE TABLE IF NOT EXISTS course_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create discussion_replies table
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES course_discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create discussion_votes table
CREATE TABLE IF NOT EXISTS discussion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES course_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id),
    UNIQUE(reply_id, user_id)
);

-- 6. Create lesson_discussions table
CREATE TABLE IF NOT EXISTS lesson_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create lesson_discussion_replies table
CREATE TABLE IF NOT EXISTS lesson_discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES lesson_discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES lesson_discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create lesson_discussion_votes table
CREATE TABLE IF NOT EXISTS lesson_discussion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES lesson_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES lesson_discussion_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id),
    UNIQUE(reply_id, user_id)
);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_id ON lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON lesson_progress(status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_at ON lesson_progress(completed_at);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

CREATE INDEX IF NOT EXISTS idx_course_discussions_course_id ON course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_author_id ON course_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_created_at ON course_discussions(created_at);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_author_id ON discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent_id ON discussion_replies(parent_reply_id);

CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson_id ON lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_course_id ON lesson_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_author_id ON lesson_discussions(author_id);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_votes ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for lesson_progress
DROP POLICY IF EXISTS "Students can view own progress" ON lesson_progress;
CREATE POLICY "Students can view own progress" ON lesson_progress
    FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own progress" ON lesson_progress;
CREATE POLICY "Students can update own progress" ON lesson_progress
    FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view all progress" ON lesson_progress;
CREATE POLICY "Instructors can view all progress" ON lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Instructors can update all progress" ON lesson_progress;
CREATE POLICY "Instructors can update all progress" ON lesson_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- 12. Create RLS policies for course_discussions
DROP POLICY IF EXISTS "Anyone can view course discussions" ON course_discussions;
CREATE POLICY "Anyone can view course discussions" ON course_discussions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create discussions" ON course_discussions;
CREATE POLICY "Authenticated users can create discussions" ON course_discussions
    FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their discussions" ON course_discussions;
CREATE POLICY "Authors can update their discussions" ON course_discussions
    FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their discussions" ON course_discussions;
CREATE POLICY "Authors can delete their discussions" ON course_discussions
    FOR DELETE USING (author_id = auth.uid());

-- 13. Create RLS policies for discussion_replies
DROP POLICY IF EXISTS "Anyone can view discussion replies" ON discussion_replies;
CREATE POLICY "Anyone can view discussion replies" ON discussion_replies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON discussion_replies;
CREATE POLICY "Authenticated users can create replies" ON discussion_replies
    FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their replies" ON discussion_replies;
CREATE POLICY "Authors can update their replies" ON discussion_replies
    FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their replies" ON discussion_replies;
CREATE POLICY "Authors can delete their replies" ON discussion_replies
    FOR DELETE USING (author_id = auth.uid());

-- 14. Create RLS policies for discussion_votes
DROP POLICY IF EXISTS "Authenticated users can vote" ON discussion_votes;
CREATE POLICY "Authenticated users can vote" ON discussion_votes
    FOR ALL USING (user_id = auth.uid());

-- 15. Create RLS policies for lesson_discussions
DROP POLICY IF EXISTS "Anyone can view lesson discussions" ON lesson_discussions;
CREATE POLICY "Anyone can view lesson discussions" ON lesson_discussions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create lesson discussions" ON lesson_discussions;
CREATE POLICY "Authenticated users can create lesson discussions" ON lesson_discussions
    FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their lesson discussions" ON lesson_discussions;
CREATE POLICY "Authors can update their lesson discussions" ON lesson_discussions
    FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their lesson discussions" ON lesson_discussions;
CREATE POLICY "Authors can delete their lesson discussions" ON lesson_discussions
    FOR DELETE USING (author_id = auth.uid());

-- 16. Create RLS policies for lesson_discussion_replies
DROP POLICY IF EXISTS "Anyone can view lesson discussion replies" ON lesson_discussion_replies;
CREATE POLICY "Anyone can view lesson discussion replies" ON lesson_discussion_replies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create lesson discussion replies" ON lesson_discussion_replies;
CREATE POLICY "Authenticated users can create lesson discussion replies" ON lesson_discussion_replies
    FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their lesson discussion replies" ON lesson_discussion_replies;
CREATE POLICY "Authors can update their lesson discussion replies" ON lesson_discussion_replies
    FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their lesson discussion replies" ON lesson_discussion_replies;
CREATE POLICY "Authors can delete their lesson discussion replies" ON lesson_discussion_replies
    FOR DELETE USING (author_id = auth.uid());

-- 17. Create RLS policies for lesson_discussion_votes
DROP POLICY IF EXISTS "Authenticated users can vote on lesson discussions" ON lesson_discussion_votes;
CREATE POLICY "Authenticated users can vote on lesson discussions" ON lesson_discussion_votes
    FOR ALL USING (user_id = auth.uid());

-- 18. Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'lesson_progress',
    'course_discussions', 
    'discussion_replies',
    'discussion_votes',
    'lesson_discussions',
    'lesson_discussion_replies',
    'lesson_discussion_votes'
)
ORDER BY tablename;

-- 19. Check if course_id column was added to lessons table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name = 'course_id';
