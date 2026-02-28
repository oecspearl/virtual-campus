-- Migration: 014-add-quiz-proctoring.sql
-- Description: Add proctored mode support for quizzes
-- Date: 2026-02-05

-- Add proctored mode flag to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS proctored_mode BOOLEAN DEFAULT false;

-- Add proctor settings to quizzes
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS proctor_settings JSONB DEFAULT '{
  "max_violations": 3,
  "fullscreen_required": true,
  "block_right_click": true,
  "block_keyboard_shortcuts": true,
  "auto_submit_on_violation": true
}'::jsonb;

-- Create table to log proctor violations
CREATE TABLE IF NOT EXISTS public.quiz_proctor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL, -- 'tab_switch', 'window_blur', 'fullscreen_exit', 'right_click', 'keyboard_shortcut'
    violation_details JSONB DEFAULT '{}', -- Additional context about the violation
    violation_count INTEGER NOT NULL DEFAULT 1, -- Running count at time of violation
    auto_submitted BOOLEAN DEFAULT false, -- Whether this violation triggered auto-submit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_proctor_logs_attempt ON public.quiz_proctor_logs(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_student ON public.quiz_proctor_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_quiz ON public.quiz_proctor_logs(quiz_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_created ON public.quiz_proctor_logs(created_at);

-- Enable RLS
ALTER TABLE public.quiz_proctor_logs ENABLE ROW LEVEL SECURITY;

-- Students can view their own proctor logs
CREATE POLICY "Students can view own proctor logs"
ON public.quiz_proctor_logs FOR SELECT
USING (auth.uid() = student_id);

-- Instructors and admins can view all proctor logs for their courses
CREATE POLICY "Instructors can view course proctor logs"
ON public.quiz_proctor_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.course_instructors ci
        JOIN public.quizzes q ON q.course_id = ci.course_id
        WHERE q.id = quiz_proctor_logs.quiz_id
        AND ci.instructor_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
    )
);

-- System can insert proctor logs (via service role)
CREATE POLICY "System can insert proctor logs"
ON public.quiz_proctor_logs FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.quiz_proctor_logs IS 'Tracks proctoring violations during quiz attempts for safe browser mode';
COMMENT ON COLUMN public.quizzes.proctored_mode IS 'When true, quiz runs in safe browser mode with violation detection';
COMMENT ON COLUMN public.quizzes.proctor_settings IS 'JSON settings for proctored mode: max_violations, fullscreen_required, etc.';
