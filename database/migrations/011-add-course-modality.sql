-- Migration: 011-add-course-modality.sql
-- Description: Add modality column to courses table for self-paced, blended, and instructor-led options

-- Add modality column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS modality VARCHAR(20) DEFAULT 'self_paced'
CHECK (modality IN ('self_paced', 'blended', 'instructor_led'));

-- Add estimated_duration column if not exists (for display purposes)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50);

-- Add index for filtering by modality
CREATE INDEX IF NOT EXISTS idx_courses_modality ON public.courses(modality);

-- Comment on column
COMMENT ON COLUMN public.courses.modality IS 'Course delivery modality: self_paced, blended, or instructor_led';
COMMENT ON COLUMN public.courses.estimated_duration IS 'Estimated duration to complete the course (e.g., "4 weeks", "20 hours")';
