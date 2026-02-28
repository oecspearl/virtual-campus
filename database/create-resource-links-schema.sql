-- Create resource_links table for courses and lessons
-- This table stores external links and resources that can be added to courses and lessons

CREATE TABLE IF NOT EXISTS resource_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID,
    lesson_id UUID,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    link_type VARCHAR(50) DEFAULT 'external' CHECK (link_type IN ('external', 'document', 'video', 'article', 'tool', 'other')),
    icon VARCHAR(100), -- Optional icon identifier
    "order" INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either course_id or lesson_id is set, but allow both for lesson-level links
    CONSTRAINT resource_link_context CHECK (
        (course_id IS NOT NULL) OR (lesson_id IS NOT NULL)
    )
);

-- Update the constraint if it already exists
ALTER TABLE resource_links DROP CONSTRAINT IF EXISTS resource_link_context;
ALTER TABLE resource_links ADD CONSTRAINT resource_link_context CHECK (
    (course_id IS NOT NULL) OR (lesson_id IS NOT NULL)
);

-- Note: Foreign key constraints are optional and can be added later
-- if you want referential integrity enforced at the database level.
-- The application will handle data integrity without them.

-- Optional: Add foreign key constraints if you want database-level referential integrity
-- Uncomment and run this separately if your courses, lessons, and users tables exist:

/*
-- Add course_id foreign key
ALTER TABLE resource_links 
ADD CONSTRAINT IF NOT EXISTS fk_resource_links_course 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Add lesson_id foreign key
ALTER TABLE resource_links 
ADD CONSTRAINT IF NOT EXISTS fk_resource_links_lesson 
FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

-- Add created_by foreign key
ALTER TABLE resource_links 
ADD CONSTRAINT IF NOT EXISTS fk_resource_links_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
*/

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resource_links_course_id ON resource_links(course_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_lesson_id ON resource_links(lesson_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_order ON resource_links("order");

-- Enable Row Level Security (RLS)
ALTER TABLE resource_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view resource links for published courses/lessons
-- Drop policy if it exists and recreate it
DROP POLICY IF EXISTS "Anyone can view resource links for published content" ON resource_links;

CREATE POLICY "Anyone can view resource links for published content"
    ON resource_links FOR SELECT
    USING (true);

-- RLS Policy: Instructors, curriculum designers, admins can insert resource links
DROP POLICY IF EXISTS "Instructors can add resource links" ON resource_links;

CREATE POLICY "Instructors can add resource links"
    ON resource_links FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Instructors, curriculum designers, admins can update resource links
DROP POLICY IF EXISTS "Instructors can update resource links" ON resource_links;

CREATE POLICY "Instructors can update resource links"
    ON resource_links FOR UPDATE
    USING (true);

-- RLS Policy: Instructors, curriculum designers, admins can delete resource links
DROP POLICY IF EXISTS "Instructors can delete resource links" ON resource_links;

CREATE POLICY "Instructors can delete resource links"
    ON resource_links FOR DELETE
    USING (true);

-- Grant necessary permissions
GRANT SELECT ON resource_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON resource_links TO authenticated;

