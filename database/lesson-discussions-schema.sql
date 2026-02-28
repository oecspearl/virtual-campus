-- Lesson Discussions Schema for OECS Learning Hub
-- This adds discussion functionality to individual lessons

-- Lesson discussions table
CREATE TABLE lesson_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure lesson belongs to the specified course
    CONSTRAINT fk_lesson_course CHECK (
        EXISTS (
            SELECT 1 FROM lessons 
            WHERE lessons.id = lesson_id 
            AND lessons.course_id = course_id
        )
    )
);

-- Lesson discussion replies table
CREATE TABLE lesson_discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES lesson_discussions(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES lesson_discussion_replies(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lesson discussion votes table
CREATE TABLE lesson_discussion_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES lesson_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES lesson_discussion_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id),
    UNIQUE(reply_id, user_id),
    CHECK (
        (discussion_id IS NOT NULL AND reply_id IS NULL) OR 
        (discussion_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX idx_lesson_discussions_lesson_id ON lesson_discussions(lesson_id);
CREATE INDEX idx_lesson_discussions_course_id ON lesson_discussions(course_id);
CREATE INDEX idx_lesson_discussions_author_id ON lesson_discussions(author_id);
CREATE INDEX idx_lesson_discussions_created_at ON lesson_discussions(created_at DESC);
CREATE INDEX idx_lesson_discussion_replies_discussion_id ON lesson_discussion_replies(discussion_id);
CREATE INDEX idx_lesson_discussion_replies_author_id ON lesson_discussion_replies(author_id);
CREATE INDEX idx_lesson_discussion_replies_parent_reply_id ON lesson_discussion_replies(parent_reply_id);
CREATE INDEX idx_lesson_discussion_replies_created_at ON lesson_discussion_replies(created_at DESC);
CREATE INDEX idx_lesson_discussion_votes_discussion_id ON lesson_discussion_votes(discussion_id);
CREATE INDEX idx_lesson_discussion_votes_reply_id ON lesson_discussion_votes(reply_id);
CREATE INDEX idx_lesson_discussion_votes_user_id ON lesson_discussion_votes(user_id);

-- Enable Row Level Security
ALTER TABLE lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_discussion_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_discussions
CREATE POLICY "Anyone can read lesson discussions" ON lesson_discussions FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create lesson discussions" ON lesson_discussions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their own lesson discussions" ON lesson_discussions FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete lesson discussions" ON lesson_discussions FOR DELETE 
USING (
    auth.uid() = author_id OR 
    auth.uid() IN (
        SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
);

-- RLS Policies for lesson_discussion_replies
CREATE POLICY "Anyone can read lesson discussion replies" ON lesson_discussion_replies FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create lesson discussion replies" ON lesson_discussion_replies FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their own lesson discussion replies" ON lesson_discussion_replies FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete lesson discussion replies" ON lesson_discussion_replies FOR DELETE 
USING (
    auth.uid() = author_id OR 
    auth.uid() IN (
        SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
);

-- RLS Policies for lesson_discussion_votes
CREATE POLICY "Anyone can read lesson discussion votes" ON lesson_discussion_votes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can vote on lesson discussions" ON lesson_discussion_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson discussion votes" ON lesson_discussion_votes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson discussion votes" ON lesson_discussion_votes FOR DELETE 
USING (auth.uid() = user_id);
