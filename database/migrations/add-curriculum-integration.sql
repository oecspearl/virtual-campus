-- Migration: Add curriculum integration for quizzes and assignments
-- This allows quizzes and assignments to appear as standalone items in the course curriculum

-- Add curriculum display fields to quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS show_in_curriculum BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS curriculum_order INTEGER;

-- Add curriculum display fields to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS show_in_curriculum BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS curriculum_order INTEGER;

-- Create index for efficient curriculum queries
CREATE INDEX IF NOT EXISTS idx_quizzes_curriculum
ON quizzes(course_id, show_in_curriculum, curriculum_order)
WHERE show_in_curriculum = true;

CREATE INDEX IF NOT EXISTS idx_assignments_curriculum
ON assignments(course_id, show_in_curriculum, curriculum_order)
WHERE show_in_curriculum = true;

-- Add comments for documentation
COMMENT ON COLUMN quizzes.show_in_curriculum IS 'When true, quiz appears as standalone item in course curriculum';
COMMENT ON COLUMN quizzes.curriculum_order IS 'Order position in curriculum when shown as standalone item';
COMMENT ON COLUMN assignments.show_in_curriculum IS 'When true, assignment appears as standalone item in course curriculum';
COMMENT ON COLUMN assignments.curriculum_order IS 'Order position in curriculum when shown as standalone item';
