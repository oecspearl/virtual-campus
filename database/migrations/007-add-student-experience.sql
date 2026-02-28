-- Migration: 007-add-student-experience.sql
-- Student Experience Features: Calendar, To-do, Notes, Bookmarks, Study Groups
-- Run this migration after 006-add-learning-pathways.sql

-- ================================================================
-- STUDENT NOTES
-- ================================================================

CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_position JSONB, -- For highlighting specific parts of content
    highlight_color VARCHAR(20) DEFAULT 'yellow',
    is_private BOOLEAN DEFAULT true,
    tags TEXT[], -- Allow tagging notes for organization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_notes_student ON student_notes(student_id);
CREATE INDEX idx_student_notes_lesson ON student_notes(student_id, lesson_id);
CREATE INDEX idx_student_notes_course ON student_notes(student_id, course_id);
CREATE INDEX idx_student_notes_tags ON student_notes USING GIN(tags);

-- ================================================================
-- STUDENT BOOKMARKS
-- ================================================================

CREATE TABLE IF NOT EXISTS student_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookmark_type VARCHAR(50) NOT NULL, -- 'lesson', 'course', 'resource', 'discussion', 'quiz'
    bookmark_id UUID NOT NULL,
    folder VARCHAR(100), -- Optional folder organization
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, bookmark_type, bookmark_id)
);

CREATE INDEX idx_student_bookmarks_student ON student_bookmarks(student_id);
CREATE INDEX idx_student_bookmarks_type ON student_bookmarks(student_id, bookmark_type);
CREATE INDEX idx_student_bookmarks_folder ON student_bookmarks(student_id, folder);

-- ================================================================
-- CALENDAR EVENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS student_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'assignment', 'quiz', 'class', 'study', 'custom', 'reminder'
    source_type VARCHAR(50), -- 'assignment', 'quiz', 'announcement', 'manual'
    source_id UUID, -- Reference to the source item
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    reminder_minutes INTEGER[], -- Array of reminder times in minutes before event
    recurrence_rule TEXT, -- iCal RRULE format for recurring events
    color VARCHAR(20),
    is_synced BOOLEAN DEFAULT false, -- Whether synced from external source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_student ON student_calendar_events(student_id);
CREATE INDEX idx_calendar_events_date ON student_calendar_events(student_id, start_datetime);
CREATE INDEX idx_calendar_events_source ON student_calendar_events(source_type, source_id);

-- ================================================================
-- UNIFIED TODO LIST
-- ================================================================

CREATE TABLE IF NOT EXISTS student_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50), -- 'assignment', 'quiz', 'lesson', 'custom'
    source_id UUID, -- Reference to the source item
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
    completed_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT false, -- Whether synced from external source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_todos_student ON student_todos(student_id);
CREATE INDEX idx_student_todos_status ON student_todos(student_id, status);
CREATE INDEX idx_student_todos_due ON student_todos(student_id, due_date);
CREATE INDEX idx_student_todos_course ON student_todos(student_id, course_id);

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
    join_code VARCHAR(20) UNIQUE, -- For invite-only groups
    avatar_url VARCHAR(500),
    settings JSONB DEFAULT '{}', -- Group settings like notifications, permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_groups_course ON study_groups(course_id);
CREATE INDEX idx_study_groups_creator ON study_groups(created_by);
CREATE INDEX idx_study_groups_join_code ON study_groups(join_code);

-- ================================================================
-- STUDY GROUP MEMBERS
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    nickname VARCHAR(100),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notifications_enabled BOOLEAN DEFAULT true,
    UNIQUE(group_id, student_id)
);

CREATE INDEX idx_study_group_members_group ON study_group_members(group_id);
CREATE INDEX idx_study_group_members_student ON study_group_members(student_id);

-- ================================================================
-- STUDY GROUP MESSAGES
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(255),
    reply_to_id UUID REFERENCES study_group_messages(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_group_messages_group ON study_group_messages(group_id, created_at DESC);
CREATE INDEX idx_study_group_messages_sender ON study_group_messages(sender_id);
CREATE INDEX idx_study_group_messages_pinned ON study_group_messages(group_id, is_pinned) WHERE is_pinned = true;

-- ================================================================
-- STUDY GROUP EVENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS study_group_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_group_events_group ON study_group_events(group_id, start_datetime);

-- ================================================================
-- STUDY SESSION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS student_study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    focus_score INTEGER, -- 0-100 based on activity patterns
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_student ON student_study_sessions(student_id, start_time DESC);
CREATE INDEX idx_study_sessions_course ON student_study_sessions(student_id, course_id);

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_study_sessions ENABLE ROW LEVEL SECURITY;

-- Student Notes Policies
DROP POLICY IF EXISTS "Students can manage own notes" ON student_notes;
CREATE POLICY "Students can manage own notes" ON student_notes
    FOR ALL USING (student_id = auth.uid());

-- Student Bookmarks Policies
DROP POLICY IF EXISTS "Students can manage own bookmarks" ON student_bookmarks;
CREATE POLICY "Students can manage own bookmarks" ON student_bookmarks
    FOR ALL USING (student_id = auth.uid());

-- Calendar Events Policies
DROP POLICY IF EXISTS "Students can manage own calendar" ON student_calendar_events;
CREATE POLICY "Students can manage own calendar" ON student_calendar_events
    FOR ALL USING (student_id = auth.uid());

-- Todos Policies
DROP POLICY IF EXISTS "Students can manage own todos" ON student_todos;
CREATE POLICY "Students can manage own todos" ON student_todos
    FOR ALL USING (student_id = auth.uid());

-- Study Groups Policies
DROP POLICY IF EXISTS "Anyone can view public groups" ON study_groups;
CREATE POLICY "Anyone can view public groups" ON study_groups
    FOR SELECT USING (is_private = false OR created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_groups.id AND student_id = auth.uid()));

DROP POLICY IF EXISTS "Creators can manage groups" ON study_groups;
CREATE POLICY "Creators can manage groups" ON study_groups
    FOR ALL USING (created_by = auth.uid());

-- Study Group Members Policies
DROP POLICY IF EXISTS "Members can view group members" ON study_group_members;
CREATE POLICY "Members can view group members" ON study_group_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM study_group_members sgm WHERE sgm.group_id = study_group_members.group_id AND sgm.student_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students can manage own membership" ON study_group_members;
CREATE POLICY "Students can manage own membership" ON study_group_members
    FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Group admins can manage members" ON study_group_members;
CREATE POLICY "Group admins can manage members" ON study_group_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM study_group_members sgm WHERE sgm.group_id = study_group_members.group_id
                AND sgm.student_id = auth.uid() AND sgm.role IN ('owner', 'admin'))
    );

-- Study Group Messages Policies
DROP POLICY IF EXISTS "Members can view messages" ON study_group_messages;
CREATE POLICY "Members can view messages" ON study_group_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "Members can send messages" ON study_group_messages;
CREATE POLICY "Members can send messages" ON study_group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "Senders can edit own messages" ON study_group_messages;
CREATE POLICY "Senders can edit own messages" ON study_group_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Study Group Events Policies
DROP POLICY IF EXISTS "Members can view group events" ON study_group_events;
CREATE POLICY "Members can view group events" ON study_group_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_events.group_id AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage group events" ON study_group_events;
CREATE POLICY "Admins can manage group events" ON study_group_events
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_events.group_id
                AND student_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Study Sessions Policies
DROP POLICY IF EXISTS "Students can manage own sessions" ON student_study_sessions;
CREATE POLICY "Students can manage own sessions" ON student_study_sessions
    FOR ALL USING (student_id = auth.uid());

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to sync calendar events from assignments and quizzes
CREATE OR REPLACE FUNCTION sync_student_calendar_from_deadlines(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    events_created INTEGER := 0;
    quiz_events INTEGER := 0;
BEGIN
    -- Sync from assignments
    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, all_day
    )
    SELECT
        p_student_id,
        'assignment',
        'assignment',
        a.id,
        'Due: ' || a.title,
        'Assignment due for ' || c.title,
        a.due_date,
        false
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
    WHERE a.due_date > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id
        AND sce.source_type = 'assignment'
        AND sce.source_id = a.id
    );

    GET DIAGNOSTICS events_created = ROW_COUNT;

    -- Sync from quizzes
    INSERT INTO student_calendar_events (
        student_id, event_type, source_type, source_id, title, description, start_datetime, end_datetime
    )
    SELECT
        p_student_id,
        'quiz',
        'quiz',
        q.id,
        'Quiz: ' || q.title,
        'Quiz available for ' || c.title,
        COALESCE(q.available_from, NOW()),
        q.available_until
    FROM quizzes q
    JOIN lessons l ON q.lesson_id = l.id
    JOIN courses c ON l.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
    WHERE (q.available_until IS NULL OR q.available_until > NOW())
    AND NOT EXISTS (
        SELECT 1 FROM student_calendar_events sce
        WHERE sce.student_id = p_student_id
        AND sce.source_type = 'quiz'
        AND sce.source_id = q.id
    );

    GET DIAGNOSTICS quiz_events = ROW_COUNT;
    events_created := events_created + quiz_events;

    RETURN events_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync todos from assignments
CREATE OR REPLACE FUNCTION sync_student_todos_from_deadlines(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    todos_created INTEGER := 0;
BEGIN
    -- Sync from assignments
    INSERT INTO student_todos (
        student_id, source_type, source_id, course_id, title, description, due_date, priority, is_synced
    )
    SELECT
        p_student_id,
        'assignment',
        a.id,
        a.course_id,
        a.title,
        LEFT(a.description, 500),
        a.due_date,
        CASE
            WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'urgent'
            WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 'high'
            WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 'medium'
            ELSE 'low'
        END,
        true
    FROM assignments a
    JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = p_student_id
    WHERE a.due_date > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = p_student_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM student_todos st
        WHERE st.student_id = p_student_id
        AND st.source_type = 'assignment'
        AND st.source_id = a.id
    );

    GET DIAGNOSTICS todos_created = ROW_COUNT;

    RETURN todos_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate a unique join code
CREATE OR REPLACE FUNCTION generate_group_join_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_count INTEGER;
BEGIN
    LOOP
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FOR 8));
        SELECT COUNT(*) INTO exists_count FROM study_groups WHERE join_code = code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate join code for new groups
CREATE OR REPLACE FUNCTION auto_generate_join_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.join_code IS NULL THEN
        NEW.join_code := generate_group_join_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_groups_join_code_trigger ON study_groups;
CREATE TRIGGER study_groups_join_code_trigger
    BEFORE INSERT ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_join_code();

-- Trigger to auto-add creator as owner of new group
CREATE OR REPLACE FUNCTION auto_add_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO study_group_members (group_id, student_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_groups_add_creator_trigger ON study_groups;
CREATE TRIGGER study_groups_add_creator_trigger
    AFTER INSERT ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_group_creator();

-- Function to update todo status based on due dates
CREATE OR REPLACE FUNCTION update_overdue_todos()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE student_todos
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
    AND due_date < NOW();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON student_notes TO authenticated;
GRANT ALL ON student_bookmarks TO authenticated;
GRANT ALL ON student_calendar_events TO authenticated;
GRANT ALL ON student_todos TO authenticated;
GRANT ALL ON study_groups TO authenticated;
GRANT ALL ON study_group_members TO authenticated;
GRANT ALL ON study_group_messages TO authenticated;
GRANT ALL ON study_group_events TO authenticated;
GRANT ALL ON student_study_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION sync_student_calendar_from_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION sync_student_todos_from_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION generate_group_join_code TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_todos TO authenticated;
