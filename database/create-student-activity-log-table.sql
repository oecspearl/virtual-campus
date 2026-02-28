-- Create student_activity_log table for tracking student activities
CREATE TABLE IF NOT EXISTS public.student_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  item_id UUID,
  item_type TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_activity_log_student_id ON public.student_activity_log(student_id);
CREATE INDEX idx_activity_log_course_id ON public.student_activity_log(course_id);
CREATE INDEX idx_activity_log_created_at ON public.student_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_student_course ON public.student_activity_log(student_id, course_id);
CREATE INDEX idx_activity_log_item ON public.student_activity_log(item_id, item_type);

-- Enable Row Level Security
ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own activity logs
CREATE POLICY "Students can view own activity logs" ON public.student_activity_log
  FOR SELECT
  USING (auth.uid() = student_id);

-- Policy: Students can insert their own activity logs
CREATE POLICY "Students can insert own activity logs" ON public.student_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Policy: Admins, instructors, and curriculum designers can view all activity logs
CREATE POLICY "Staff can view all activity logs" ON public.student_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
    )
  );

-- Add comment to table
COMMENT ON TABLE public.student_activity_log IS 'Tracks student activities including course access, item views, and interactions';
COMMENT ON COLUMN public.student_activity_log.activity_type IS 'Type of activity: course_access, lesson_viewed, quiz_attempted, assignment_viewed, etc.';
COMMENT ON COLUMN public.student_activity_log.item_type IS 'Type of item accessed: lesson, quiz, assignment, file, etc.';
COMMENT ON COLUMN public.student_activity_log.action IS 'Action performed: viewed, completed, submitted, downloaded, etc.';
COMMENT ON COLUMN public.student_activity_log.metadata IS 'Additional data about the activity (JSON)';

