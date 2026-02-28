-- Fix Analytics API - Ensure Enrollments Table Has Required Columns
-- This ensures the enrollments table has all columns needed for analytics queries
-- Specifically: course_id and progress_percentage

-- First, check current columns
SELECT 
    'Current Columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add course_id column if it doesn't exist
    -- Note: Some schemas use 'class_id', this adds 'course_id' for compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'course_id') THEN
        -- Check if courses table exists, if not create a reference that can be updated later
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
            ALTER TABLE enrollments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added course_id column';
        ELSE
            ALTER TABLE enrollments ADD COLUMN course_id UUID;
            RAISE NOTICE 'Added course_id column (no foreign key - courses table not found)';
        END IF;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
    END IF;
    
    -- Add progress_percentage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'enrollments' AND column_name = 'progress_percentage') THEN
        ALTER TABLE enrollments ADD COLUMN progress_percentage INTEGER DEFAULT 0 
            CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        RAISE NOTICE 'Added progress_percentage column';
    ELSE
        -- Update existing column to ensure it has the check constraint
        -- First, drop existing constraint if it exists
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_progress_percentage_check;
        -- Add check constraint
        ALTER TABLE enrollments ADD CONSTRAINT enrollments_progress_percentage_check 
            CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        -- Set default for NULL values
        UPDATE enrollments SET progress_percentage = 0 WHERE progress_percentage IS NULL;
        ALTER TABLE enrollments ALTER COLUMN progress_percentage SET DEFAULT 0;
        ALTER TABLE enrollments ALTER COLUMN progress_percentage SET NOT NULL;
        RAISE NOTICE 'Updated progress_percentage column constraints';
    END IF;
    
    -- Ensure status column exists and has correct default
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'enrollments' AND column_name = 'status') THEN
        -- Ensure status has a default value
        ALTER TABLE enrollments ALTER COLUMN status SET DEFAULT 'active';
        -- Update NULL statuses to 'active'
        UPDATE enrollments SET status = 'active' WHERE status IS NULL;
    END IF;
    
END $$;

-- Create or update indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status_course ON enrollments(status, course_id) WHERE course_id IS NOT NULL;

-- If course_id column was just added and class_id exists, you may want to migrate data
-- Uncomment the following if you need to copy data from class_id to course_id:
/*
DO $$
DECLARE
    has_class_id BOOLEAN;
    has_course_id BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'class_id'
    ) INTO has_class_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'course_id'
    ) INTO has_course_id;
    
    -- If class_id exists and course_id was just added, try to map class_id to course_id
    -- This assumes classes table has a course_id column
    IF has_class_id AND has_course_id THEN
        UPDATE enrollments e
        SET course_id = c.course_id
        FROM classes c
        WHERE e.class_id = c.id 
        AND e.course_id IS NULL
        AND c.course_id IS NOT NULL;
        
        RAISE NOTICE 'Migrated course_id from class_id relationships';
    END IF;
END $$;
*/

-- Verify the columns exist
SELECT 
    'Verification' as info,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments'
AND table_schema = 'public'
AND column_name IN ('id', 'course_id', 'status', 'progress_percentage', 'student_id')
ORDER BY 
    CASE column_name
        WHEN 'id' THEN 1
        WHEN 'student_id' THEN 2
        WHEN 'course_id' THEN 3
        WHEN 'status' THEN 4
        WHEN 'progress_percentage' THEN 5
    END;

