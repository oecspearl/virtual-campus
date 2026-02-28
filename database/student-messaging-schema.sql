-- =============================================================================
-- STUDENT MESSAGING SCHEMA
-- Direct and group messaging between students and instructors
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER FUNCTIONS (to avoid RLS recursion)
-- =============================================================================

-- Check if user is a chat room member
CREATE OR REPLACE FUNCTION is_student_chat_member(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM student_chat_members
        WHERE user_id = check_user_id AND room_id = check_room_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a chat room admin/owner
CREATE OR REPLACE FUNCTION is_student_chat_admin(check_user_id UUID, check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM student_chat_members
        WHERE user_id = check_user_id
        AND room_id = check_room_id
        AND member_role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has blocked another user
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM student_chat_blocked_users
        WHERE student_chat_blocked_users.blocker_id = is_user_blocked.blocker_id
        AND student_chat_blocked_users.blocked_id = is_user_blocked.blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CHAT ROOMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255), -- NULL for direct messages
    description TEXT,
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('direct', 'group', 'course', 'study_group')),
    -- For course-based chats
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    -- Room settings
    avatar_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CHAT MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES student_chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    member_role VARCHAR(20) DEFAULT 'member' CHECK (member_role IN ('owner', 'admin', 'member')),
    nickname VARCHAR(100), -- Optional display name override
    is_muted BOOLEAN DEFAULT false,
    last_read_at TIMESTAMP WITH TIME ZONE,
    last_read_message_id UUID,
    unread_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- =============================================================================
-- CHAT MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES student_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    -- File attachments
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size BIGINT,
    -- Reply/thread support
    reply_to_id UUID REFERENCES student_chat_messages(id) ON DELETE SET NULL,
    -- Status
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MESSAGE REACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_chat_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES student_chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL, -- emoji or reaction type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

-- =============================================================================
-- BLOCKED USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_chat_blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_type ON student_chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_course_id ON student_chat_rooms(course_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_last_message ON student_chat_rooms(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_created_by ON student_chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_student_chat_rooms_created_at ON student_chat_rooms(created_at DESC);

-- Chat members indexes
CREATE INDEX IF NOT EXISTS idx_student_chat_members_room_id ON student_chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_members_user_id ON student_chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_members_user_room ON student_chat_members(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_members_unread ON student_chat_members(user_id, unread_count) WHERE unread_count > 0;

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_room_id ON student_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_sender_id ON student_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_created_at ON student_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_room_created ON student_chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_chat_messages_reply_to ON student_chat_messages(reply_to_id);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_student_chat_reactions_message ON student_chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_reactions_user ON student_chat_reactions(user_id);

-- Blocked users indexes
CREATE INDEX IF NOT EXISTS idx_student_chat_blocked_blocker ON student_chat_blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_student_chat_blocked_blocked ON student_chat_blocked_users(blocked_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE student_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_chat_blocked_users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CHAT ROOMS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can view rooms they are members of" ON student_chat_rooms;
CREATE POLICY "Users can view rooms they are members of" ON student_chat_rooms FOR SELECT
USING (
    is_student_chat_member(auth.uid(), id) OR
    -- Course members can see course chat rooms
    (room_type = 'course' AND course_id IN (
        SELECT course_id FROM enrollments WHERE student_id = auth.uid() AND status = 'active'
        UNION
        SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON student_chat_rooms;
CREATE POLICY "Authenticated users can create rooms" ON student_chat_rooms FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by AND
    room_type IN ('direct', 'group', 'study_group')
);

DROP POLICY IF EXISTS "Room admins can update rooms" ON student_chat_rooms;
CREATE POLICY "Room admins can update rooms" ON student_chat_rooms FOR UPDATE
USING (is_student_chat_admin(auth.uid(), id));

DROP POLICY IF EXISTS "Room owners can delete rooms" ON student_chat_rooms;
CREATE POLICY "Room owners can delete rooms" ON student_chat_rooms FOR DELETE
USING (
    created_by = auth.uid() OR
    auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
);

-- =============================================================================
-- CHAT MEMBERS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can view members of rooms they belong to" ON student_chat_members;
CREATE POLICY "Users can view members of rooms they belong to" ON student_chat_members FOR SELECT
USING (is_student_chat_member(auth.uid(), room_id));

DROP POLICY IF EXISTS "Users can join or be added to rooms" ON student_chat_members;
CREATE POLICY "Users can join or be added to rooms" ON student_chat_members FOR INSERT
WITH CHECK (
    -- Creator adds themselves
    (auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM student_chat_rooms WHERE id = room_id AND created_by = auth.uid()
    )) OR
    -- Room admins can add members
    is_student_chat_admin(auth.uid(), room_id) OR
    -- Direct message participants
    (EXISTS (
        SELECT 1 FROM student_chat_rooms
        WHERE id = room_id AND room_type = 'direct' AND created_by = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Users can update their own membership" ON student_chat_members;
CREATE POLICY "Users can update their own membership" ON student_chat_members FOR UPDATE
USING (auth.uid() = user_id OR is_student_chat_admin(auth.uid(), room_id));

DROP POLICY IF EXISTS "Users can leave or admins can remove" ON student_chat_members;
CREATE POLICY "Users can leave or admins can remove" ON student_chat_members FOR DELETE
USING (auth.uid() = user_id OR is_student_chat_admin(auth.uid(), room_id));

-- =============================================================================
-- CHAT MESSAGES POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Members can view messages in their rooms" ON student_chat_messages;
CREATE POLICY "Members can view messages in their rooms" ON student_chat_messages FOR SELECT
USING (
    is_student_chat_member(auth.uid(), room_id) AND
    -- Filter out messages from blocked users
    NOT is_user_blocked(auth.uid(), sender_id)
);

DROP POLICY IF EXISTS "Members can send messages" ON student_chat_messages;
CREATE POLICY "Members can send messages" ON student_chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    is_student_chat_member(auth.uid(), room_id)
);

DROP POLICY IF EXISTS "Senders can update their own messages" ON student_chat_messages;
CREATE POLICY "Senders can update their own messages" ON student_chat_messages FOR UPDATE
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Senders and admins can delete messages" ON student_chat_messages;
CREATE POLICY "Senders and admins can delete messages" ON student_chat_messages FOR DELETE
USING (auth.uid() = sender_id OR is_student_chat_admin(auth.uid(), room_id));

-- =============================================================================
-- REACTIONS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Members can view reactions" ON student_chat_reactions;
CREATE POLICY "Members can view reactions" ON student_chat_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM student_chat_messages m
        WHERE m.id = message_id AND is_student_chat_member(auth.uid(), m.room_id)
    )
);

DROP POLICY IF EXISTS "Members can add reactions" ON student_chat_reactions;
CREATE POLICY "Members can add reactions" ON student_chat_reactions FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM student_chat_messages m
        WHERE m.id = message_id AND is_student_chat_member(auth.uid(), m.room_id)
    )
);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON student_chat_reactions;
CREATE POLICY "Users can remove their own reactions" ON student_chat_reactions FOR DELETE
USING (auth.uid() = user_id);

-- =============================================================================
-- BLOCKED USERS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their blocked list" ON student_chat_blocked_users;
CREATE POLICY "Users can view their blocked list" ON student_chat_blocked_users FOR SELECT
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON student_chat_blocked_users;
CREATE POLICY "Users can block others" ON student_chat_blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock others" ON student_chat_blocked_users;
CREATE POLICY "Users can unblock others" ON student_chat_blocked_users FOR DELETE
USING (auth.uid() = blocker_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update room member count when members change
CREATE OR REPLACE FUNCTION update_student_chat_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE student_chat_rooms
        SET
            member_count = (SELECT COUNT(*) FROM student_chat_members WHERE room_id = NEW.room_id),
            updated_at = NOW()
        WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE student_chat_rooms
        SET
            member_count = (SELECT COUNT(*) FROM student_chat_members WHERE room_id = OLD.room_id),
            updated_at = NOW()
        WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_chat_member_count ON student_chat_members;
CREATE TRIGGER trigger_update_student_chat_member_count
    AFTER INSERT OR DELETE ON student_chat_members
    FOR EACH ROW EXECUTE FUNCTION update_student_chat_member_count();

-- Update room last_message info when messages are sent
CREATE OR REPLACE FUNCTION update_student_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update room stats
        UPDATE student_chat_rooms
        SET
            last_message_at = NEW.created_at,
            last_message_preview = LEFT(NEW.content, 100),
            updated_at = NOW()
        WHERE id = NEW.room_id;

        -- Update unread counts for all members except sender
        UPDATE student_chat_members
        SET unread_count = unread_count + 1
        WHERE room_id = NEW.room_id AND user_id != NEW.sender_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_chat_last_message ON student_chat_messages;
CREATE TRIGGER trigger_update_student_chat_last_message
    AFTER INSERT ON student_chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_student_chat_last_message();

-- Reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_student_chat_unread()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_read_at IS NOT NULL AND (OLD.last_read_at IS NULL OR NEW.last_read_at > OLD.last_read_at) THEN
        NEW.unread_count := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_student_chat_unread ON student_chat_members;
CREATE TRIGGER trigger_reset_student_chat_unread
    BEFORE UPDATE ON student_chat_members
    FOR EACH ROW EXECUTE FUNCTION reset_student_chat_unread();

-- =============================================================================
-- VERIFY SETUP
-- =============================================================================

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename LIKE 'student_chat%'
ORDER BY tablename, policyname;
