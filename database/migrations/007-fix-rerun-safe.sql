-- Migration: 007-fix-rerun-safe.sql
-- Safe re-run script for Student Experience Features
-- This script can be run multiple times without errors

-- ================================================================
-- HELPER FUNCTION FOR SAFE INDEX CREATION
-- ================================================================

CREATE OR REPLACE FUNCTION create_index_if_not_exists(
    p_index_name TEXT,
    p_table_name TEXT,
    p_columns TEXT,
    p_using TEXT DEFAULT ''
) RETURNS VOID AS $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = p_index_name
    ) INTO index_exists;

    IF NOT index_exists THEN
        IF p_using != '' THEN
            EXECUTE format('CREATE INDEX %I ON %s USING %s', p_index_name, p_table_name, p_using);
        ELSE
            EXECUTE format('CREATE INDEX %I ON %s (%s)', p_index_name, p_table_name, p_columns);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STUDENT NOTES
-- ================================================================

CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_position JSONB,
    highlight_color VARCHAR(20) DEFAULT 'yellow',
    is_private BOOLEAN DEFAULT true,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_student_notes_student', 'student_notes', 'student_id');
SELECT create_index_if_not_exists('idx_student_notes_lesson', 'student_notes', 'student_id, lesson_id');
SELECT create_index_if_not_exists('idx_student_notes_course', 'student_notes', 'student_id, course_id');
SELECT create_index_if_not_exists('idx_student_notes_tags', 'student_notes', '', 'GIN(tags)');

-- ================================================================
-- STUDENT BOOKMARKS
-- ================================================================

CREATE TABLE IF NOT EXISTS student_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookmark_type VARCHAR(50) NOT NULL,
    bookmark_id UUID NOT NULL,
    folder VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, bookmark_type, bookmark_id)
);

SELECT create_index_if_not_exists('idx_student_bookmarks_student', 'student_bookmarks', 'student_id');
SELECT create_index_if_not_exists('idx_student_bookmarks_type', 'student_bookmarks', 'student_id, bookmark_type');
SELECT create_index_if_not_exists('idx_student_bookmarks_folder', 'student_bookmarks', 'student_id, folder');

-- ================================================================
-- CALENDAR EVENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS student_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(50),
    source_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    reminder_minutes INTEGER[],
    recurrence_rule TEXT,
    color VARCHAR(20),
    is_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_calendar_events_student', 'student_calendar_events', 'student_id');
SELECT create_index_if_not_exists('idx_calendar_events_date', 'student_calendar_events', 'student_id, start_datetime');
SELECT create_index_if_not_exists('idx_calendar_events_source', 'student_calendar_events', 'source_type, source_id');

-- ================================================================
-- UNIFIED TODO LIST
-- ================================================================

CREATE TABLE IF NOT EXISTS student_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50),
    source_id UUID,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_student_todos_student', 'student_todos', 'student_id');
SELECT create_index_if_not_exists('idx_student_todos_status', 'student_todos', 'student_id, status');
SELECT create_index_if_not_exists('idx_student_todos_due', 'student_todos', 'student_id, due_date');
SELECT create_index_if_not_exists('idx_student_todos_course', 'student_todos', 'student_id, course_id');

-- ================================================================
-- STUDY GROUPS
-- ================================================================

CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 10,
    join_code VARCHAR(20) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_study_groups_course', 'study_groups', 'course_id');
SELECT create_index_if_not_exists('idx_study_groups_creator', 'study_groups', 'created_by');
SELECT create_index_if_not_exists('idx_study_groups_join_code', 'study_groups', 'join_code');

-- ================================================================
-- STUDY GROUP MEMBERS
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, student_id)
);

SELECT create_index_if_not_exists('idx_study_group_members_group', 'study_group_members', 'group_id');
SELECT create_index_if_not_exists('idx_study_group_members_student', 'study_group_members', 'student_id');

-- ================================================================
-- STUDY GROUP MESSAGES
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    is_pinned BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_study_group_messages_group', 'study_group_messages', 'group_id, created_at DESC');
SELECT create_index_if_not_exists('idx_study_group_messages_sender', 'study_group_messages', 'sender_id');

-- ================================================================
-- STUDY GROUP EVENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'study_session',
    location VARCHAR(255),
    meeting_link TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_study_group_events_group', 'study_group_events', 'group_id');
SELECT create_index_if_not_exists('idx_study_group_events_date', 'study_group_events', 'start_datetime');

-- ================================================================
-- STUDY SESSIONS (POMODORO/TRACKING)
-- ================================================================

CREATE TABLE IF NOT EXISTS student_study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    study_group_id UUID REFERENCES study_groups(id) ON DELETE SET NULL,
    session_type VARCHAR(50) DEFAULT 'study',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT create_index_if_not_exists('idx_study_sessions_student', 'student_study_sessions', 'student_id');
SELECT create_index_if_not_exists('idx_study_sessions_date', 'student_study_sessions', 'student_id, started_at');

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_study_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can manage own notes" ON student_notes;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON student_bookmarks;
DROP POLICY IF EXISTS "Users can manage own calendar events" ON student_calendar_events;
DROP POLICY IF EXISTS "Users can manage own todos" ON student_todos;
DROP POLICY IF EXISTS "Users can view public groups or joined groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view group memberships" ON study_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
DROP POLICY IF EXISTS "Members can view group messages" ON study_group_messages;
DROP POLICY IF EXISTS "Members can send messages" ON study_group_messages;
DROP POLICY IF EXISTS "Members can view group events" ON study_group_events;
DROP POLICY IF EXISTS "Owners and moderators can manage events" ON study_group_events;
DROP POLICY IF EXISTS "Users can manage own study sessions" ON student_study_sessions;

-- Student Notes Policies
CREATE POLICY "Users can manage own notes" ON student_notes
    FOR ALL USING (auth.uid() = student_id);

-- Student Bookmarks Policies
CREATE POLICY "Users can manage own bookmarks" ON student_bookmarks
    FOR ALL USING (auth.uid() = student_id);

-- Calendar Events Policies
CREATE POLICY "Users can manage own calendar events" ON student_calendar_events
    FOR ALL USING (auth.uid() = student_id);

-- Todos Policies
CREATE POLICY "Users can manage own todos" ON student_todos
    FOR ALL USING (auth.uid() = student_id);

-- Study Groups Policies
CREATE POLICY "Users can view public groups or joined groups" ON study_groups
    FOR SELECT USING (
        NOT is_private
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM study_group_members
            WHERE group_id = study_groups.id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON study_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can update groups" ON study_groups
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group owners can delete groups" ON study_groups
    FOR DELETE USING (auth.uid() = created_by);

-- Study Group Members Policies
CREATE POLICY "Members can view group memberships" ON study_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_group_members m
            WHERE m.group_id = study_group_members.group_id AND m.student_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM study_groups g
            WHERE g.id = study_group_members.group_id AND g.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can join groups" ON study_group_members
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can leave groups" ON study_group_members
    FOR DELETE USING (auth.uid() = student_id);

-- Study Group Messages Policies
CREATE POLICY "Members can view group messages" ON study_group_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_group_members
            WHERE group_id = study_group_messages.group_id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Members can send messages" ON study_group_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM study_group_members
            WHERE group_id = study_group_messages.group_id AND student_id = auth.uid()
        )
    );

-- Study Group Events Policies
CREATE POLICY "Members can view group events" ON study_group_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_group_members
            WHERE group_id = study_group_events.group_id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Owners and moderators can manage events" ON study_group_events
    FOR ALL USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM study_group_members
            WHERE group_id = study_group_events.group_id
            AND student_id = auth.uid()
            AND role IN ('owner', 'moderator')
        )
    );

-- Study Sessions Policies
CREATE POLICY "Users can manage own study sessions" ON student_study_sessions
    FOR ALL USING (auth.uid() = student_id);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Generate join code for study groups
CREATE OR REPLACE FUNCTION generate_study_group_join_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := upper(substring(md5(random()::text) from 1 for 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_study_group_join_code ON study_groups;
CREATE TRIGGER set_study_group_join_code
    BEFORE INSERT ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION generate_study_group_join_code();

-- Auto-add creator as owner member
CREATE OR REPLACE FUNCTION add_study_group_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO study_group_members (group_id, student_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (group_id, student_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_owner_to_study_group ON study_groups;
CREATE TRIGGER add_owner_to_study_group
    AFTER INSERT ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION add_study_group_owner();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_student_experience_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_notes_timestamp ON student_notes;
CREATE TRIGGER update_student_notes_timestamp
    BEFORE UPDATE ON student_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_student_experience_timestamp();

DROP TRIGGER IF EXISTS update_calendar_events_timestamp ON student_calendar_events;
CREATE TRIGGER update_calendar_events_timestamp
    BEFORE UPDATE ON student_calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_student_experience_timestamp();

DROP TRIGGER IF EXISTS update_todos_timestamp ON student_todos;
CREATE TRIGGER update_todos_timestamp
    BEFORE UPDATE ON student_todos
    FOR EACH ROW
    EXECUTE FUNCTION update_student_experience_timestamp();

DROP TRIGGER IF EXISTS update_study_groups_timestamp ON study_groups;
CREATE TRIGGER update_study_groups_timestamp
    BEFORE UPDATE ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_student_experience_timestamp();

-- Sync calendar from deadlines
CREATE OR REPLACE FUNCTION sync_student_calendar_from_deadlines(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    events_created INTEGER := 0;
    quiz_events INTEGER := 0;
BEGIN
    -- Sync from assignments
    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, color, is_synced
    )
    SELECT
        p_student_id,
        'assignment',
        'assignment',
        a.id,
        'Due: ' || a.title,
        a.description,
        a.due_date,
        '#10b981',
        true
    FROM assignments a
    JOIN enrollments e ON e.course_id = a.course_id
    WHERE e.student_id = p_student_id
    AND a.due_date > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id
        AND sce.source_type = 'assignment'
        AND sce.source_id = a.id
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS events_created = ROW_COUNT;

    -- Sync from quizzes
    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, color, is_synced
    )
    SELECT
        p_student_id,
        'quiz',
        'quiz',
        q.id,
        'Quiz: ' || q.title,
        q.description,
        q.available_until,
        '#f59e0b',
        true
    FROM quizzes q
    JOIN lessons l ON l.id = q.lesson_id
    JOIN courses c ON c.id = l.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = p_student_id
    AND q.available_until > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id
        AND sce.source_type = 'quiz'
        AND sce.source_id = q.id
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS quiz_events = ROW_COUNT;
    events_created := events_created + quiz_events;

    RETURN events_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up helper function
DROP FUNCTION IF EXISTS create_index_if_not_exists(TEXT, TEXT, TEXT, TEXT);

-- ================================================================
-- DONE
-- ================================================================
-- Migration 007 complete. Student Experience features are now available.
