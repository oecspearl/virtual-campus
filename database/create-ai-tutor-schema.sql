-- AI Tutor Database Schema
-- This script creates tables for AI tutor functionality

-- 1. AI Tutor Conversations table
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    context_data JSONB, -- Store lesson context used for the response
    response_type VARCHAR(50), -- explanation, example, help, practice, summary, general
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI Tutor Preferences table
CREATE TABLE IF NOT EXISTS ai_tutor_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    preferred_style VARCHAR(20) DEFAULT 'balanced' CHECK (preferred_style IN ('simple', 'detailed', 'balanced')),
    learning_focus VARCHAR(50) DEFAULT 'general', -- visual, auditory, kinesthetic, general
    auto_activate BOOLEAN DEFAULT false, -- Auto-activate AI tutor when entering lessons
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

-- 3. AI Tutor Analytics table
CREATE TABLE IF NOT EXISTS ai_tutor_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    interaction_count INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0,
    concepts_explained INTEGER DEFAULT 0,
    examples_requested INTEGER DEFAULT 0,
    help_requests INTEGER DEFAULT 0,
    practice_requests INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- in minutes
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_student_id ON ai_tutor_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_lesson_id ON ai_tutor_conversations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_course_id ON ai_tutor_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_created_at ON ai_tutor_conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_preferences_student_id ON ai_tutor_preferences(student_id);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_analytics_student_id ON ai_tutor_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_analytics_lesson_id ON ai_tutor_analytics(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_analytics_course_id ON ai_tutor_analytics(course_id);

-- 5. Enable RLS
ALTER TABLE ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_analytics ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Conversations: Students can only see their own conversations
CREATE POLICY "Students can view own conversations" ON ai_tutor_conversations
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert own conversations" ON ai_tutor_conversations
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Instructors and admins can view all conversations for their courses
CREATE POLICY "Instructors can view course conversations" ON ai_tutor_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = ai_tutor_conversations.course_id 
            AND ci.instructor_id = auth.uid()
        )
    );

-- Preferences: Students can manage their own preferences
CREATE POLICY "Students can manage own preferences" ON ai_tutor_preferences
    FOR ALL USING (student_id = auth.uid());

-- Analytics: Students can view their own analytics
CREATE POLICY "Students can view own analytics" ON ai_tutor_analytics
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert own analytics" ON ai_tutor_analytics
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Instructors can view analytics for their courses
CREATE POLICY "Instructors can view course analytics" ON ai_tutor_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = ai_tutor_analytics.course_id 
            AND ci.instructor_id = auth.uid()
        )
    );
