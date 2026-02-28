-- Add featured field to courses table
-- Allows admins to mark courses as featured for homepage display

-- Add featured column if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Add index for faster queries on featured courses
CREATE INDEX IF NOT EXISTS idx_courses_featured ON courses(featured) WHERE featured = true;

-- Add comment
COMMENT ON COLUMN courses.featured IS 'Set to true to display course on homepage featured section';

-- Example: Mark some courses as featured (adjust IDs as needed)
-- UPDATE courses SET featured = true WHERE id IN ('course-uuid-1', 'course-uuid-2', 'course-uuid-3');

-- Update RLS policies to allow admins/instructors to update featured status
-- Note: This assumes you already have RLS policies for course updates
-- If not, you'll need to add policies for UPDATE operations
