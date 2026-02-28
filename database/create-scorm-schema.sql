-- SCORM Integration Schema
-- Run this in Supabase SQL Editor

-- 1. Add content_type column to lessons table
DO $$ 
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' 
        AND column_name = 'content_type'
    ) THEN
        ALTER TABLE lessons 
        ADD COLUMN content_type VARCHAR(50) DEFAULT 'rich_text' 
        CHECK (content_type IN ('rich_text', 'video', 'scorm', 'quiz', 'assignment'));
        
        -- Create index for content_type
        CREATE INDEX IF NOT EXISTS idx_lessons_content_type ON lessons(content_type);
        
        RAISE NOTICE 'Added content_type column to lessons table';
    ELSE
        RAISE NOTICE 'content_type column already exists';
    END IF;
END $$;

-- 2. SCORM Packages table
CREATE TABLE IF NOT EXISTS scorm_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    scorm_version VARCHAR(20) NOT NULL CHECK (scorm_version IN ('1.2', '2004')),
    package_url TEXT NOT NULL, -- Path to extracted package in storage
    manifest_xml TEXT, -- Stored manifest XML for reference
    package_size BIGINT, -- Size in bytes
    identifier VARCHAR(500), -- SCORM package identifier
    schema_version VARCHAR(50),
    schema_location VARCHAR(500),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(lesson_id) -- One SCORM package per lesson
);

-- Indexes for scorm_packages
CREATE INDEX IF NOT EXISTS idx_scorm_packages_lesson_id ON scorm_packages(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scorm_packages_course_id ON scorm_packages(course_id);
CREATE INDEX IF NOT EXISTS idx_scorm_packages_scorm_version ON scorm_packages(scorm_version);

-- 3. SCORM Tracking table (stores student progress and interactions)
CREATE TABLE IF NOT EXISTS scorm_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scorm_package_id UUID NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- SCORM 1.2 Data Model Elements
    completion_status VARCHAR(50) DEFAULT 'unknown', -- completed, incomplete, not attempted, unknown
    success_status VARCHAR(50), -- passed, failed, unknown
    score_raw DECIMAL(10,2), -- Raw score
    score_max DECIMAL(10,2), -- Maximum score
    score_min DECIMAL(10,2), -- Minimum score
    score_scaled DECIMAL(5,4) CHECK (score_scaled >= -1 AND score_scaled <= 1), -- Scaled score (-1 to 1)
    
    -- Progress and Time
    progress_measure DECIMAL(5,4) CHECK (progress_measure >= 0 AND progress_measure <= 1), -- 0 to 1
    time_spent INTEGER DEFAULT 0, -- Total time spent in seconds
    session_time INTEGER DEFAULT 0, -- Current session time in seconds
    total_time VARCHAR(255), -- Total time (SCORM format: PT4H18M23S)
    
    -- Navigation
    entry VARCHAR(50) DEFAULT 'ab-initio', -- ab-initio, resume, ''
    exit VARCHAR(50), -- time-out, suspend, logout, normal, ''
    location TEXT, -- Bookmark location
    launch_data TEXT, -- Launch data from manifest
    suspend_data TEXT, -- Suspend data (student's state to resume)
    
    -- Interactions tracking (JSONB for flexibility)
    interactions JSONB DEFAULT '[]'::jsonb, -- Array of interaction objects
    objectives JSONB DEFAULT '[]'::jsonb, -- Array of objective objects
    
    -- SCORM 2004 specific fields
    scaled_passing_score DECIMAL(5,4),
    mastery_score DECIMAL(5,4),
    max_time_allowed VARCHAR(255),
    time_limit_action VARCHAR(50), -- exit, message, continue, ''
    
    -- Metadata
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    last_saved TIMESTAMPTZ DEFAULT NOW(),
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one tracking record per student per SCORM package
    UNIQUE(student_id, scorm_package_id)
);

-- Indexes for scorm_tracking
CREATE INDEX IF NOT EXISTS idx_scorm_tracking_student_id ON scorm_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_scorm_tracking_scorm_package_id ON scorm_tracking(scorm_package_id);
CREATE INDEX IF NOT EXISTS idx_scorm_tracking_course_id ON scorm_tracking(course_id);
CREATE INDEX IF NOT EXISTS idx_scorm_tracking_lesson_id ON scorm_tracking(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scorm_tracking_completion_status ON scorm_tracking(completion_status);

-- 4. Enable RLS on new tables
ALTER TABLE scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorm_tracking ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for scorm_packages
-- Users can view SCORM packages for published lessons they can access
CREATE POLICY "Users can view accessible scorm packages" ON scorm_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.id = scorm_packages.lesson_id
            AND l.published = true
            AND (
                -- Student enrolled in course
                EXISTS (
                    SELECT 1 FROM enrollments e
                    WHERE e.course_id = scorm_packages.course_id
                    AND e.student_id = auth.uid()
                    AND e.status = 'active'
                )
                OR
                -- Instructor/Admin access
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = auth.uid()
                    AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
                )
                OR
                -- Creator of the package
                created_by = auth.uid()
            )
        )
    );

-- Instructors/Admins can insert SCORM packages
CREATE POLICY "Instructors can create scorm packages" ON scorm_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        OR created_by = auth.uid()
    );

-- Instructors/Admins can update SCORM packages
CREATE POLICY "Instructors can update scorm packages" ON scorm_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        OR created_by = auth.uid()
    );

-- Instructors/Admins can delete SCORM packages
CREATE POLICY "Instructors can delete scorm packages" ON scorm_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
        OR created_by = auth.uid()
    );

-- 6. RLS Policies for scorm_tracking
-- Students can view their own tracking data
CREATE POLICY "Students can view own scorm tracking" ON scorm_tracking
    FOR SELECT USING (student_id = auth.uid());

-- Students can insert their own tracking data (via SCORM API)
CREATE POLICY "Students can create own scorm tracking" ON scorm_tracking
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students can update their own tracking data
CREATE POLICY "Students can update own scorm tracking" ON scorm_tracking
    FOR UPDATE USING (student_id = auth.uid());

-- Instructors/Admins can view all tracking data
CREATE POLICY "Instructors can view all scorm tracking" ON scorm_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Instructors/Admins can update all tracking data
CREATE POLICY "Instructors can update all scorm tracking" ON scorm_tracking
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scorm_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scorm_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_saved = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_scorm_packages_updated_at ON scorm_packages;
CREATE TRIGGER trigger_scorm_packages_updated_at
    BEFORE UPDATE ON scorm_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_scorm_packages_updated_at();

DROP TRIGGER IF EXISTS trigger_scorm_tracking_updated_at ON scorm_tracking;
CREATE TRIGGER trigger_scorm_tracking_updated_at
    BEFORE UPDATE ON scorm_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_scorm_tracking_updated_at();

-- 8. Function to sync SCORM completion to lesson_progress
CREATE OR REPLACE FUNCTION sync_scorm_to_lesson_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if SCORM is completed
    IF NEW.completion_status = 'completed' OR NEW.success_status = 'passed' THEN
        -- Update or insert lesson_progress
        INSERT INTO lesson_progress (student_id, lesson_id, status, completed_at, time_spent, last_accessed_at)
        VALUES (
            NEW.student_id,
            NEW.lesson_id,
            'completed',
            COALESCE(NEW.last_saved, NOW()),
            NEW.time_spent,
            NEW.last_accessed
        )
        ON CONFLICT (student_id, lesson_id)
        DO UPDATE SET
            status = 'completed',
            completed_at = COALESCE(NEW.last_saved, NOW()),
            time_spent = GREATEST(lesson_progress.time_spent, NEW.time_spent),
            last_accessed_at = NEW.last_accessed,
            updated_at = NOW();
    ELSIF NEW.completion_status = 'incomplete' THEN
        -- Update to in_progress if not already completed
        INSERT INTO lesson_progress (student_id, lesson_id, status, started_at, time_spent, last_accessed_at)
        VALUES (
            NEW.student_id,
            NEW.lesson_id,
            'in_progress',
            COALESCE(NEW.created_at, NOW()),
            NEW.time_spent,
            NEW.last_accessed
        )
        ON CONFLICT (student_id, lesson_id)
        DO UPDATE SET
            status = CASE 
                WHEN lesson_progress.status = 'completed' THEN 'completed'
                ELSE 'in_progress'
            END,
            time_spent = GREATEST(lesson_progress.time_spent, NEW.time_spent),
            last_accessed_at = NEW.last_accessed,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync SCORM tracking to lesson_progress
DROP TRIGGER IF EXISTS trigger_sync_scorm_to_lesson_progress ON scorm_tracking;
CREATE TRIGGER trigger_sync_scorm_to_lesson_progress
    AFTER INSERT OR UPDATE OF completion_status, success_status, time_spent ON scorm_tracking
    FOR EACH ROW
    WHEN (NEW.lesson_id IS NOT NULL)
    EXECUTE FUNCTION sync_scorm_to_lesson_progress();

COMMENT ON TABLE scorm_packages IS 'Stores SCORM package metadata and references';
COMMENT ON TABLE scorm_tracking IS 'Tracks student progress and interactions with SCORM content';
COMMENT ON FUNCTION sync_scorm_to_lesson_progress IS 'Automatically syncs SCORM completion status to lesson_progress table';

