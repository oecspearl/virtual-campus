-- Fix RLS policies for assignment_submissions table
-- This allows students to submit assignments and instructors to view/grade them

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Students can insert their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Instructors can view all submissions for their assignments" ON assignment_submissions;
DROP POLICY IF EXISTS "Instructors can update submissions for grading" ON assignment_submissions;

-- Policy 1: Students can view their own submissions
CREATE POLICY "Students can view their own submissions" ON assignment_submissions
    FOR SELECT
    USING (student_id = auth.uid());

-- Policy 2: Students can insert their own submissions
CREATE POLICY "Students can insert their own submissions" ON assignment_submissions
    FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Policy 3: Students can update their own submissions (for drafts)
CREATE POLICY "Students can update their own submissions" ON assignment_submissions
    FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Policy 4: Instructors can view all submissions for assignments they created
CREATE POLICY "Instructors can view submissions for their assignments" ON assignment_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_submissions.assignment_id
            AND a.creator_id = auth.uid()
        )
    );

-- Policy 5: Instructors can update submissions for grading
CREATE POLICY "Instructors can update submissions for grading" ON assignment_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_submissions.assignment_id
            AND a.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_submissions.assignment_id
            AND a.creator_id = auth.uid()
        )
    );

-- Policy 6: Course instructors can view submissions for assignments in their courses
CREATE POLICY "Course instructors can view submissions for course assignments" ON assignment_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN lessons l ON l.id = a.lesson_id
            JOIN course_instructors ci ON ci.course_id = l.course_id
            WHERE a.id = assignment_submissions.assignment_id
            AND ci.instructor_id = auth.uid()
        )
    );

-- Policy 7: Course instructors can update submissions for grading in their courses
CREATE POLICY "Course instructors can update submissions for course grading" ON assignment_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN lessons l ON l.id = a.lesson_id
            JOIN course_instructors ci ON ci.course_id = l.course_id
            WHERE a.id = assignment_submissions.assignment_id
            AND ci.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN lessons l ON l.id = a.lesson_id
            JOIN course_instructors ci ON ci.course_id = l.course_id
            WHERE a.id = assignment_submissions.assignment_id
            AND ci.instructor_id = auth.uid()
        )
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'assignment_submissions'
ORDER BY policyname;
