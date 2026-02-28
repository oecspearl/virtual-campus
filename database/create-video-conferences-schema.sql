-- Video conferencing schema for OECS Learning Hub LMS
-- This script creates the necessary tables for video conferencing functionality

-- Video conferences table
CREATE TABLE IF NOT EXISTS video_conferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    meeting_id VARCHAR(255) UNIQUE NOT NULL,
    meeting_url TEXT NOT NULL,
    meeting_password VARCHAR(50),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 100,
    recording_enabled BOOLEAN DEFAULT false,
    waiting_room_enabled BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
    video_provider VARCHAR(50) DEFAULT '8x8vc' CHECK (video_provider IN ('8x8vc', 'google_meet', 'bigbluebutton')),
    google_meet_link TEXT,
    bbb_meeting_id VARCHAR(255),
    bbb_attendee_pw VARCHAR(50),
    bbb_moderator_pw VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conference participants table
CREATE TABLE IF NOT EXISTS conference_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES video_conferences(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('host', 'co-host', 'participant')),
    UNIQUE(conference_id, user_id)
);

-- Conference recordings table
CREATE TABLE IF NOT EXISTS conference_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conference_id UUID REFERENCES video_conferences(id) ON DELETE CASCADE,
    recording_url TEXT NOT NULL,
    recording_duration INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_conferences
DROP POLICY IF EXISTS "Users can view conferences for their enrolled courses" ON video_conferences;
CREATE POLICY "Users can view conferences for their enrolled courses" ON video_conferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.student_id = auth.uid() 
            AND enrollments.course_id = video_conferences.course_id
            AND enrollments.status = 'active'
        )
        OR instructor_id = auth.uid()
    );

DROP POLICY IF EXISTS "Instructors can create conferences for their courses" ON video_conferences;
CREATE POLICY "Instructors can create conferences for their courses" ON video_conferences
    FOR INSERT WITH CHECK (
        instructor_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = video_conferences.course_id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can update their conferences" ON video_conferences;
CREATE POLICY "Instructors can update their conferences" ON video_conferences
    FOR UPDATE USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can delete their conferences" ON video_conferences;
CREATE POLICY "Instructors can delete their conferences" ON video_conferences
    FOR DELETE USING (instructor_id = auth.uid());

-- RLS Policies for conference_participants
DROP POLICY IF EXISTS "Users can view participants for conferences they can access" ON conference_participants;
CREATE POLICY "Users can view participants for conferences they can access" ON conference_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_participants.conference_id
            AND (
                EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.student_id = auth.uid() 
                    AND enrollments.course_id = video_conferences.course_id
                    AND enrollments.status = 'active'
                )
                OR video_conferences.instructor_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can join conferences they have access to" ON conference_participants;
CREATE POLICY "Users can join conferences they have access to" ON conference_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_participants.conference_id
            AND (
                EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.student_id = auth.uid() 
                    AND enrollments.course_id = video_conferences.course_id
                    AND enrollments.status = 'active'
                )
                OR video_conferences.instructor_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their own participation" ON conference_participants;
CREATE POLICY "Users can update their own participation" ON conference_participants
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for conference_recordings
DROP POLICY IF EXISTS "Users can view recordings for conferences they can access" ON conference_recordings;
CREATE POLICY "Users can view recordings for conferences they can access" ON conference_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_recordings.conference_id
            AND (
                EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.student_id = auth.uid() 
                    AND enrollments.course_id = video_conferences.course_id
                    AND enrollments.status = 'active'
                )
                OR video_conferences.instructor_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Instructors can create recordings for their conferences" ON conference_recordings;
CREATE POLICY "Instructors can create recordings for their conferences" ON conference_recordings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_recordings.conference_id
            AND video_conferences.instructor_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_conferences_course_id ON video_conferences(course_id);
CREATE INDEX IF NOT EXISTS idx_video_conferences_instructor_id ON video_conferences(instructor_id);
CREATE INDEX IF NOT EXISTS idx_video_conferences_status ON video_conferences(status);
CREATE INDEX IF NOT EXISTS idx_video_conferences_scheduled_at ON video_conferences(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_conference_participants_conference_id ON conference_participants(conference_id);
CREATE INDEX IF NOT EXISTS idx_conference_participants_user_id ON conference_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conference_recordings_conference_id ON conference_recordings(conference_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for video_conferences
DROP TRIGGER IF EXISTS update_video_conferences_updated_at ON video_conferences;
CREATE TRIGGER update_video_conferences_updated_at 
    BEFORE UPDATE ON video_conferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
