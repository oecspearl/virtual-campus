-- Complete RLS Policy Fix for Admin Access
-- Run this in Supabase SQL Editor to give admins full CRUD access

-- ==============================================
-- 1. COURSE_INSTRUCTORS TABLE POLICIES
-- ==============================================

-- Enable RLS on course_instructors table
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all course instructors" ON course_instructors;
DROP POLICY IF EXISTS "Course instructors can view their own assignments" ON course_instructors;
DROP POLICY IF EXISTS "Admins can add course instructors" ON course_instructors;
DROP POLICY IF EXISTS "Admins can update course instructors" ON course_instructors;
DROP POLICY IF EXISTS "Admins can delete course instructors" ON course_instructors;

-- Policy: Allow admins to view all course instructors
CREATE POLICY "Admins can view all course instructors" ON course_instructors
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow course instructors to view their own assignments
CREATE POLICY "Course instructors can view their own assignments" ON course_instructors
    FOR SELECT
    TO authenticated
    USING (instructor_id = auth.uid());

-- Policy: Allow admins to insert course instructors
CREATE POLICY "Admins can add course instructors" ON course_instructors
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to update course instructors
CREATE POLICY "Admins can update course instructors" ON course_instructors
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to delete course instructors
CREATE POLICY "Admins can delete course instructors" ON course_instructors
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- ==============================================
-- 2. COURSES TABLE POLICIES
-- ==============================================

-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Admins can create courses" ON courses;
DROP POLICY IF EXISTS "Instructors can create courses" ON courses;
DROP POLICY IF EXISTS "Admins can update all courses" ON courses;
DROP POLICY IF EXISTS "Course instructors can update their courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete all courses" ON courses;
DROP POLICY IF EXISTS "Course instructors can delete their courses" ON courses;

-- Policy: Allow everyone to view published courses
CREATE POLICY "Everyone can view published courses" ON courses
    FOR SELECT
    TO authenticated
    USING (published = true);

-- Policy: Allow admins to view ALL courses (published and unpublished)
CREATE POLICY "Admins can view all courses" ON courses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow admins to create courses
CREATE POLICY "Admins can create courses" ON courses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to create courses (for backward compatibility)
CREATE POLICY "Instructors can create courses" ON courses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('instructor', 'curriculum_designer', 'admin', 'super_admin')
        )
    );

-- Policy: Allow admins to update ALL courses
CREATE POLICY "Admins can update all courses" ON courses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to update courses they're assigned to (for backward compatibility)
CREATE POLICY "Course instructors can update their courses" ON courses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = courses.id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

-- Policy: Allow admins to delete ALL courses
CREATE POLICY "Admins can delete all courses" ON courses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to delete courses they're assigned to (for backward compatibility)
CREATE POLICY "Course instructors can delete their courses" ON courses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = courses.id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

-- ==============================================
-- 3. VIDEO_CONFERENCES TABLE POLICIES
-- ==============================================

-- Enable RLS on video_conferences table
ALTER TABLE video_conferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conferences for their enrolled courses" ON video_conferences;
DROP POLICY IF EXISTS "Instructors can create conferences for their courses" ON video_conferences;
DROP POLICY IF EXISTS "Instructors can update their conferences" ON video_conferences;
DROP POLICY IF EXISTS "Instructors can delete their conferences" ON video_conferences;
DROP POLICY IF EXISTS "Admins can view all video conferences" ON video_conferences;
DROP POLICY IF EXISTS "Admins can create video conferences" ON video_conferences;
DROP POLICY IF EXISTS "Admins can update all video conferences" ON video_conferences;
DROP POLICY IF EXISTS "Admins can delete all video conferences" ON video_conferences;

-- Policy: Allow admins to view ALL video conferences
CREATE POLICY "Admins can view all video conferences" ON video_conferences
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow users to view conferences for their enrolled courses
CREATE POLICY "Users can view conferences for their enrolled courses" ON video_conferences
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.student_id = auth.uid() 
            AND enrollments.course_id = video_conferences.course_id
            AND enrollments.status = 'active'
        )
        OR instructor_id = auth.uid()
    );

-- Policy: Allow admins to create video conferences
CREATE POLICY "Admins can create video conferences" ON video_conferences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to create conferences for their courses
CREATE POLICY "Instructors can create conferences for their courses" ON video_conferences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        instructor_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM course_instructors 
            WHERE course_instructors.course_id = video_conferences.course_id 
            AND course_instructors.instructor_id = auth.uid()
        )
    );

-- Policy: Allow admins to update ALL video conferences
CREATE POLICY "Admins can update all video conferences" ON video_conferences
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to update their conferences
CREATE POLICY "Instructors can update their conferences" ON video_conferences
    FOR UPDATE
    TO authenticated
    USING (instructor_id = auth.uid());

-- Policy: Allow admins to delete ALL video conferences
CREATE POLICY "Admins can delete all video conferences" ON video_conferences
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to delete their conferences
CREATE POLICY "Instructors can delete their conferences" ON video_conferences
    FOR DELETE
    TO authenticated
    USING (instructor_id = auth.uid());

-- ==============================================
-- 4. CONFERENCE_PARTICIPANTS TABLE POLICIES
-- ==============================================

-- Enable RLS on conference_participants table
ALTER TABLE conference_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own participation" ON conference_participants;
DROP POLICY IF EXISTS "Instructors can manage participants" ON conference_participants;
DROP POLICY IF EXISTS "Admins can view all participants" ON conference_participants;
DROP POLICY IF EXISTS "Admins can manage all participants" ON conference_participants;

-- Policy: Allow admins to view all participants
CREATE POLICY "Admins can view all participants" ON conference_participants
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow users to view their own participation
CREATE POLICY "Users can view their own participation" ON conference_participants
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Allow admins to manage all participants
CREATE POLICY "Admins can manage all participants" ON conference_participants
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to manage participants for their conferences
CREATE POLICY "Instructors can manage participants" ON conference_participants
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_participants.conference_id 
            AND video_conferences.instructor_id = auth.uid()
        )
    );

-- ==============================================
-- 5. CONFERENCE_RECORDINGS TABLE POLICIES
-- ==============================================

-- Enable RLS on conference_recordings table
ALTER TABLE conference_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view recordings for their enrolled courses" ON conference_recordings;
DROP POLICY IF EXISTS "Instructors can manage recordings" ON conference_recordings;
DROP POLICY IF EXISTS "Admins can view all recordings" ON conference_recordings;
DROP POLICY IF EXISTS "Admins can manage all recordings" ON conference_recordings;

-- Policy: Allow admins to view all recordings
CREATE POLICY "Admins can view all recordings" ON conference_recordings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow users to view recordings for their enrolled courses
CREATE POLICY "Users can view recordings for their enrolled courses" ON conference_recordings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM video_conferences vc
            JOIN enrollments e ON e.course_id = vc.course_id
            WHERE vc.id = conference_recordings.conference_id
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
    );

-- Policy: Allow admins to manage all recordings
CREATE POLICY "Admins can manage all recordings" ON conference_recordings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
        )
    );

-- Policy: Allow instructors to manage recordings for their conferences
CREATE POLICY "Instructors can manage recordings" ON conference_recordings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM video_conferences 
            WHERE video_conferences.id = conference_recordings.conference_id 
            AND video_conferences.instructor_id = auth.uid()
        )
    );

-- ==============================================
-- 6. VERIFICATION QUERIES
-- ==============================================

-- Verify course_instructors policies
SELECT 'course_instructors policies:' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'course_instructors'
ORDER BY policyname;

-- Verify courses policies
SELECT 'courses policies:' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'courses'
ORDER BY policyname;

-- Verify video_conferences policies
SELECT 'video_conferences policies:' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'video_conferences'
ORDER BY policyname;

-- Verify conference_participants policies
SELECT 'conference_participants policies:' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'conference_participants'
ORDER BY policyname;

-- Verify conference_recordings policies
SELECT 'conference_recordings policies:' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'conference_recordings'
ORDER BY policyname;

-- Check RLS status
SELECT 'RLS Status:' as info, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('courses', 'course_instructors', 'video_conferences', 'conference_participants', 'conference_recordings')
ORDER BY tablename;
