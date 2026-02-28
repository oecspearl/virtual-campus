-- Migration: 019-add-anonymous-grading.sql
-- Add anonymous grading support to assignments

-- Add anonymous_grading column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS anonymous_grading BOOLEAN DEFAULT false;

-- Add comment to describe the field
COMMENT ON COLUMN assignments.anonymous_grading IS 'When true, student names are hidden from instructors during grading';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_assignments_anonymous_grading ON assignments(anonymous_grading) WHERE anonymous_grading = true;
