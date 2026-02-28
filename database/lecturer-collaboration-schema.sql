-- Lecturer Collaboration Schema for OECS Learning Hub
-- This adds collaboration features for lecturers: forums, resource sharing, and chat

-- ============================================================================
-- LECTURER FORUMS
-- ============================================================================

-- Lecturer forums table
CREATE TABLE IF NOT EXISTS lecturer_forums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general', -- 'general', 'subject-specific', 'best-practices', 'problem-solving'
    subject_area VARCHAR(100), -- Optional, for subject-specific forums
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    reply_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer forum posts (discussions within forums)
CREATE TABLE IF NOT EXISTS lecturer_forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forum_id UUID REFERENCES lecturer_forums(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    reply_count INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer forum post replies
CREATE TABLE IF NOT EXISTS lecturer_forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES lecturer_forum_posts(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES lecturer_forum_replies(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer forum votes
CREATE TABLE IF NOT EXISTS lecturer_forum_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES lecturer_forum_posts(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES lecturer_forum_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (post_id IS NOT NULL AND reply_id IS NULL) OR 
        (post_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- ============================================================================
-- RESOURCE SHARING HUB
-- ============================================================================

-- Lecturer resources table
CREATE TABLE IF NOT EXISTS lecturer_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- 'lesson-plan', 'worksheet', 'presentation', 'assessment', 'template', 'other'
    subject_area VARCHAR(100),
    grade_level VARCHAR(50),
    file_url TEXT,
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    license_type VARCHAR(50) DEFAULT 'oecs-internal', -- 'public', 'oecs-internal', 'attribution-required'
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true, -- Auto-approve for lecturers
    tags TEXT[], -- Array of tags for better searchability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer resource ratings and reviews
CREATE TABLE IF NOT EXISTS lecturer_resource_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID REFERENCES lecturer_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_id, user_id)
);

-- Lecturer resource downloads tracking
CREATE TABLE IF NOT EXISTS lecturer_resource_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID REFERENCES lecturer_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous downloads
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer resource bookmarks
CREATE TABLE IF NOT EXISTS lecturer_resource_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID REFERENCES lecturer_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_id, user_id)
);

-- ============================================================================
-- VIRTUAL STAFF ROOM (CHAT)
-- ============================================================================

-- Lecturer chat rooms
CREATE TABLE IF NOT EXISTS lecturer_chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(50) DEFAULT 'group', -- 'direct', 'group', 'subject', 'project'
    subject_area VARCHAR(100), -- For subject-specific rooms
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer chat room members
CREATE TABLE IF NOT EXISTS lecturer_chat_room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES lecturer_chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, user_id)
);

-- Lecturer chat messages
CREATE TABLE IF NOT EXISTS lecturer_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES lecturer_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'system'
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    reply_to_id UUID REFERENCES lecturer_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecturer message reactions (optional, for future enhancement)
CREATE TABLE IF NOT EXISTS lecturer_message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES lecturer_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like', -- 'like', 'love', 'laugh', 'thumbs-up', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Forum indexes
CREATE INDEX IF NOT EXISTS idx_lecturer_forums_category ON lecturer_forums(category);
CREATE INDEX IF NOT EXISTS idx_lecturer_forums_subject_area ON lecturer_forums(subject_area);
CREATE INDEX IF NOT EXISTS idx_lecturer_forums_created_at ON lecturer_forums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_posts_forum_id ON lecturer_forum_posts(forum_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_posts_author_id ON lecturer_forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_posts_created_at ON lecturer_forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_replies_post_id ON lecturer_forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_replies_author_id ON lecturer_forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_forum_replies_parent_reply_id ON lecturer_forum_replies(parent_reply_id);

-- Resource indexes
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_resource_type ON lecturer_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_subject_area ON lecturer_resources(subject_area);
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_uploaded_by ON lecturer_resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_created_at ON lecturer_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_average_rating ON lecturer_resources(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_resources_download_count ON lecturer_resources(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_resource_ratings_resource_id ON lecturer_resource_ratings(resource_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_resource_downloads_resource_id ON lecturer_resource_downloads(resource_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_lecturer_chat_rooms_room_type ON lecturer_chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_lecturer_chat_rooms_subject_area ON lecturer_chat_rooms(subject_area);
CREATE INDEX IF NOT EXISTS idx_lecturer_chat_rooms_last_message_at ON lecturer_chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_chat_room_members_room_id ON lecturer_chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_chat_room_members_user_id ON lecturer_chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_messages_room_id ON lecturer_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_messages_sender_id ON lecturer_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_messages_created_at ON lecturer_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecturer_messages_room_created ON lecturer_messages(room_id, created_at DESC);

-- Partial unique indexes for forum votes (one vote per user per post/reply)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lecturer_forum_votes_post_user 
    ON lecturer_forum_votes(post_id, user_id) 
    WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lecturer_forum_votes_reply_user 
    ON lecturer_forum_votes(reply_id, user_id) 
    WHERE reply_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE lecturer_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_resource_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_resource_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_resource_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_message_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - LECTURER FORUMS
-- ============================================================================

-- Helper function to check if user is lecturer (instructor, curriculum_designer, admin, super_admin)
CREATE OR REPLACE FUNCTION is_lecturer(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a member of a room (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_room_member(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE user_id = check_user_id AND room_id = check_room_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a room admin/moderator (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_room_admin(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE user_id = check_user_id 
        AND room_id = check_room_id 
        AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lecturer forums policies
DROP POLICY IF EXISTS "Lecturers can view forums" ON lecturer_forums;
CREATE POLICY "Lecturers can view forums" ON lecturer_forums FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can create forums" ON lecturer_forums;
CREATE POLICY "Lecturers can create forums" ON lecturer_forums FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Forum creators and admins can update forums" ON lecturer_forums;
CREATE POLICY "Forum creators and admins can update forums" ON lecturer_forums FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = created_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Forum creators and admins can delete forums" ON lecturer_forums;
CREATE POLICY "Forum creators and admins can delete forums" ON lecturer_forums FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = created_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

-- Forum posts policies
DROP POLICY IF EXISTS "Lecturers can view forum posts" ON lecturer_forum_posts;
CREATE POLICY "Lecturers can view forum posts" ON lecturer_forum_posts FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can create forum posts" ON lecturer_forum_posts;
CREATE POLICY "Lecturers can create forum posts" ON lecturer_forum_posts FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Post authors and admins can update posts" ON lecturer_forum_posts;
CREATE POLICY "Post authors and admins can update posts" ON lecturer_forum_posts FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = author_id OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Post authors and admins can delete posts" ON lecturer_forum_posts;
CREATE POLICY "Post authors and admins can delete posts" ON lecturer_forum_posts FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = author_id OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

-- Forum replies policies
DROP POLICY IF EXISTS "Lecturers can view forum replies" ON lecturer_forum_replies;
CREATE POLICY "Lecturers can view forum replies" ON lecturer_forum_replies FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can create forum replies" ON lecturer_forum_replies;
CREATE POLICY "Lecturers can create forum replies" ON lecturer_forum_replies FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = author_id);

DROP POLICY IF EXISTS "Reply authors and admins can update replies" ON lecturer_forum_replies;
CREATE POLICY "Reply authors and admins can update replies" ON lecturer_forum_replies FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = author_id OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Reply authors and admins can delete replies" ON lecturer_forum_replies;
CREATE POLICY "Reply authors and admins can delete replies" ON lecturer_forum_replies FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = author_id OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

-- Forum votes policies
DROP POLICY IF EXISTS "Lecturers can view forum votes" ON lecturer_forum_votes;
CREATE POLICY "Lecturers can view forum votes" ON lecturer_forum_votes FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can vote" ON lecturer_forum_votes;
CREATE POLICY "Lecturers can vote" ON lecturer_forum_votes FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON lecturer_forum_votes;
CREATE POLICY "Users can update their own votes" ON lecturer_forum_votes FOR UPDATE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON lecturer_forum_votes;
CREATE POLICY "Users can delete their own votes" ON lecturer_forum_votes FOR DELETE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - RESOURCE SHARING
-- ============================================================================

-- Resources policies
DROP POLICY IF EXISTS "Lecturers can view resources" ON lecturer_resources;
CREATE POLICY "Lecturers can view resources" ON lecturer_resources FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can create resources" ON lecturer_resources;
CREATE POLICY "Lecturers can create resources" ON lecturer_resources FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Resource owners and admins can update resources" ON lecturer_resources;
CREATE POLICY "Resource owners and admins can update resources" ON lecturer_resources FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = uploaded_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Resource owners and admins can delete resources" ON lecturer_resources;
CREATE POLICY "Resource owners and admins can delete resources" ON lecturer_resources FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = uploaded_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

-- Resource ratings policies
DROP POLICY IF EXISTS "Lecturers can view resource ratings" ON lecturer_resource_ratings;
CREATE POLICY "Lecturers can view resource ratings" ON lecturer_resource_ratings FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can rate resources" ON lecturer_resource_ratings;
CREATE POLICY "Lecturers can rate resources" ON lecturer_resource_ratings FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON lecturer_resource_ratings;
CREATE POLICY "Users can update their own ratings" ON lecturer_resource_ratings FOR UPDATE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON lecturer_resource_ratings;
CREATE POLICY "Users can delete their own ratings" ON lecturer_resource_ratings FOR DELETE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

-- Resource downloads policies
DROP POLICY IF EXISTS "Lecturers can view download records" ON lecturer_resource_downloads;
CREATE POLICY "Lecturers can view download records" ON lecturer_resource_downloads FOR SELECT
USING (is_lecturer(auth.uid()));

DROP POLICY IF EXISTS "Lecturers can record downloads" ON lecturer_resource_downloads;
CREATE POLICY "Lecturers can record downloads" ON lecturer_resource_downloads FOR INSERT
WITH CHECK (is_lecturer(auth.uid()));

-- Resource bookmarks policies
DROP POLICY IF EXISTS "Lecturers can view bookmarks" ON lecturer_resource_bookmarks;
CREATE POLICY "Lecturers can view bookmarks" ON lecturer_resource_bookmarks FOR SELECT
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Lecturers can bookmark resources" ON lecturer_resource_bookmarks;
CREATE POLICY "Lecturers can bookmark resources" ON lecturer_resource_bookmarks FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON lecturer_resource_bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON lecturer_resource_bookmarks FOR DELETE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES - CHAT
-- ============================================================================

-- Chat rooms policies
DROP POLICY IF EXISTS "Lecturers can view chat rooms they're members of" ON lecturer_chat_rooms;
CREATE POLICY "Lecturers can view chat rooms they're members of" ON lecturer_chat_rooms FOR SELECT
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM lecturer_chat_room_members 
            WHERE room_id = lecturer_chat_rooms.id AND user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Lecturers can create chat rooms" ON lecturer_chat_rooms;
CREATE POLICY "Lecturers can create chat rooms" ON lecturer_chat_rooms FOR INSERT
WITH CHECK (is_lecturer(auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON lecturer_chat_rooms;
CREATE POLICY "Room creators and admins can update rooms" ON lecturer_chat_rooms FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = created_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Room creators and admins can delete rooms" ON lecturer_chat_rooms;
CREATE POLICY "Room creators and admins can delete rooms" ON lecturer_chat_rooms FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = created_by OR
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
);

-- Chat room members policies
DROP POLICY IF EXISTS "Lecturers can view room members" ON lecturer_chat_room_members;
CREATE POLICY "Lecturers can view room members" ON lecturer_chat_room_members FOR SELECT
USING (
    is_lecturer(auth.uid()) AND (
        user_id = auth.uid() OR
        is_room_member(auth.uid(), room_id)
    )
);

DROP POLICY IF EXISTS "Room admins can add members" ON lecturer_chat_room_members;
CREATE POLICY "Room admins can add members" ON lecturer_chat_room_members FOR INSERT
WITH CHECK (
    is_lecturer(auth.uid()) AND
    is_lecturer(user_id) AND
    (
        EXISTS (
            SELECT 1 FROM lecturer_chat_rooms 
            WHERE id = room_id AND created_by = auth.uid()
        ) OR
        is_room_admin(auth.uid(), room_id)
    )
);

DROP POLICY IF EXISTS "Users can leave rooms" ON lecturer_chat_room_members;
CREATE POLICY "Users can leave rooms" ON lecturer_chat_room_members FOR DELETE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "Lecturers can view messages in their rooms" ON lecturer_messages;
CREATE POLICY "Lecturers can view messages in their rooms" ON lecturer_messages FOR SELECT
USING (
    is_lecturer(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE room_id = lecturer_messages.room_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Room members can send messages" ON lecturer_messages;
CREATE POLICY "Room members can send messages" ON lecturer_messages FOR INSERT
WITH CHECK (
    is_lecturer(auth.uid()) AND
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM lecturer_chat_room_members
        WHERE room_id = lecturer_messages.room_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Message senders can update their messages" ON lecturer_messages;
CREATE POLICY "Message senders can update their messages" ON lecturer_messages FOR UPDATE
USING (
    is_lecturer(auth.uid()) AND
    auth.uid() = sender_id
);

DROP POLICY IF EXISTS "Message senders and room admins can delete messages" ON lecturer_messages;
CREATE POLICY "Message senders and room admins can delete messages" ON lecturer_messages FOR DELETE
USING (
    is_lecturer(auth.uid()) AND (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM lecturer_chat_room_members
            WHERE room_id = lecturer_messages.room_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    )
);

-- Message reactions policies
DROP POLICY IF EXISTS "Room members can view reactions" ON lecturer_message_reactions;
CREATE POLICY "Room members can view reactions" ON lecturer_message_reactions FOR SELECT
USING (
    is_lecturer(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM lecturer_messages m
        JOIN lecturer_chat_room_members r ON r.room_id = m.room_id
        WHERE m.id = lecturer_message_reactions.message_id AND r.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Room members can react to messages" ON lecturer_message_reactions;
CREATE POLICY "Room members can react to messages" ON lecturer_message_reactions FOR INSERT
WITH CHECK (
    is_lecturer(auth.uid()) AND
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM lecturer_messages m
        JOIN lecturer_chat_room_members r ON r.room_id = m.room_id
        WHERE m.id = lecturer_message_reactions.message_id AND r.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON lecturer_message_reactions;
CREATE POLICY "Users can delete their own reactions" ON lecturer_message_reactions FOR DELETE
USING (is_lecturer(auth.uid()) AND auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Function to update forum post reply count
CREATE OR REPLACE FUNCTION update_forum_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lecturer_forum_posts 
        SET reply_count = reply_count + 1 
        WHERE id = NEW.post_id;
        UPDATE lecturer_forums 
        SET reply_count = reply_count + 1 
        WHERE id = (SELECT forum_id FROM lecturer_forum_posts WHERE id = NEW.post_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lecturer_forum_posts 
        SET reply_count = GREATEST(0, reply_count - 1) 
        WHERE id = OLD.post_id;
        UPDATE lecturer_forums 
        SET reply_count = GREATEST(0, reply_count - 1) 
        WHERE id = (SELECT forum_id FROM lecturer_forum_posts WHERE id = OLD.post_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_post_reply_count ON lecturer_forum_replies;
CREATE TRIGGER trigger_update_forum_post_reply_count
    AFTER INSERT OR DELETE ON lecturer_forum_replies
    FOR EACH ROW EXECUTE FUNCTION update_forum_post_reply_count();

-- Function to update forum post vote count
CREATE OR REPLACE FUNCTION update_forum_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE lecturer_forum_posts 
            SET vote_count = (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = NEW.post_id AND vote_type = 'up'
            ) - (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = NEW.post_id AND vote_type = 'down'
            )
            WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE lecturer_forum_posts 
            SET vote_count = (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = NEW.post_id AND vote_type = 'up'
            ) - (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = NEW.post_id AND vote_type = 'down'
            )
            WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE lecturer_forum_posts 
            SET vote_count = (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = OLD.post_id AND vote_type = 'up'
            ) - (
                SELECT COUNT(*) FROM lecturer_forum_votes 
                WHERE post_id = OLD.post_id AND vote_type = 'down'
            )
            WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_post_vote_count ON lecturer_forum_votes;
CREATE TRIGGER trigger_update_forum_post_vote_count
    AFTER INSERT OR UPDATE OR DELETE ON lecturer_forum_votes
    FOR EACH ROW EXECUTE FUNCTION update_forum_post_vote_count();

-- Function to update resource average rating
CREATE OR REPLACE FUNCTION update_resource_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lecturer_resources 
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0) 
            FROM lecturer_resource_ratings 
            WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM lecturer_resource_ratings 
            WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
        )
    WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_resource_rating ON lecturer_resource_ratings;
CREATE TRIGGER trigger_update_resource_rating
    AFTER INSERT OR UPDATE OR DELETE ON lecturer_resource_ratings
    FOR EACH ROW EXECUTE FUNCTION update_resource_rating();

-- Function to update chat room member count and last message
CREATE OR REPLACE FUNCTION update_chat_room_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lecturer_chat_rooms 
        SET 
            member_count = (SELECT COUNT(*) FROM lecturer_chat_room_members WHERE room_id = NEW.room_id),
            last_message_at = NOW()
        WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lecturer_chat_rooms 
        SET member_count = (SELECT COUNT(*) FROM lecturer_chat_room_members WHERE room_id = OLD.room_id)
        WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_room_stats_members ON lecturer_chat_room_members;
CREATE TRIGGER trigger_update_chat_room_stats_members
    AFTER INSERT OR DELETE ON lecturer_chat_room_members
    FOR EACH ROW EXECUTE FUNCTION update_chat_room_stats();

DROP TRIGGER IF EXISTS trigger_update_chat_room_stats_messages ON lecturer_messages;
CREATE TRIGGER trigger_update_chat_room_stats_messages
    AFTER INSERT ON lecturer_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_room_stats();

-- Function to update resource download count
CREATE OR REPLACE FUNCTION update_resource_download_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lecturer_resources 
        SET download_count = download_count + 1 
        WHERE id = NEW.resource_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_resource_download_count ON lecturer_resource_downloads;
CREATE TRIGGER trigger_update_resource_download_count
    AFTER INSERT ON lecturer_resource_downloads
    FOR EACH ROW EXECUTE FUNCTION update_resource_download_count();

