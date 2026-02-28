-- Migration: 025-add-quiz-extensions.sql
-- Description: Add per-student quiz extensions for deadlines, time limits, and attempts
-- Date: 2026-02-27

-- Create quiz_extensions table
CREATE TABLE IF NOT EXISTS public.quiz_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

    -- Override fields (NULL means "use quiz default")
    extended_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    extended_available_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    extra_time_minutes INTEGER DEFAULT NULL,
    extra_attempts INTEGER DEFAULT NULL,

    -- Metadata
    reason TEXT DEFAULT NULL,
    granted_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Each student can only have one extension per quiz
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_extensions_quiz_student
    ON public.quiz_extensions(quiz_id, student_id);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_quiz_extensions_quiz ON public.quiz_extensions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_extensions_student ON public.quiz_extensions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_extensions_course ON public.quiz_extensions(course_id);

-- Enable RLS
ALTER TABLE public.quiz_extensions ENABLE ROW LEVEL SECURITY;

-- Students can view their own extensions
CREATE POLICY "Students can view own quiz extensions"
ON public.quiz_extensions FOR SELECT
USING (auth.uid() = student_id);

-- Staff can view extensions for quizzes in their courses
CREATE POLICY "Staff can view course quiz extensions"
ON public.quiz_extensions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.course_instructors ci
        WHERE ci.course_id = quiz_extensions.course_id
        AND ci.instructor_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'curriculum_designer')
    )
);

-- Service role can manage all extensions
CREATE POLICY "Service role manages quiz extensions"
ON public.quiz_extensions FOR ALL
USING (true)
WITH CHECK (true);

-- Grants
GRANT SELECT ON public.quiz_extensions TO authenticated;
GRANT ALL ON public.quiz_extensions TO service_role;

COMMENT ON TABLE public.quiz_extensions IS 'Per-student overrides for quiz deadlines, time limits, and attempt counts';
COMMENT ON COLUMN public.quiz_extensions.extra_time_minutes IS 'Additional minutes added to the quiz time_limit for this student';
COMMENT ON COLUMN public.quiz_extensions.extra_attempts IS 'Additional attempts added to the quiz attempts_allowed for this student';
