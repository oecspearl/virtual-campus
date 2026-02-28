-- Migration: 006-fix-rls-policies.sql
-- Fix RLS policies to use users.role (role column is on users table, not user_profiles)

-- ============================================================================
-- LEARNING PATHS RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view published learning paths" ON learning_paths;
CREATE POLICY "Anyone can view published learning paths"
ON learning_paths FOR SELECT
USING (published = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

DROP POLICY IF EXISTS "Admins can manage learning paths" ON learning_paths;
CREATE POLICY "Admins can manage learning paths"
ON learning_paths FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- ============================================================================
-- LEARNING PATH COURSES RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view learning path courses" ON learning_path_courses;
CREATE POLICY "Anyone can view learning path courses"
ON learning_path_courses FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage learning path courses" ON learning_path_courses;
CREATE POLICY "Admins can manage learning path courses"
ON learning_path_courses FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- ============================================================================
-- LEARNING PATH ENROLLMENTS RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can view own path enrollments"
ON learning_path_enrollments FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Users can manage own path enrollments" ON learning_path_enrollments;
CREATE POLICY "Users can manage own path enrollments"
ON learning_path_enrollments FOR ALL
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
));

-- ============================================================================
-- COMPETENCIES RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view competencies" ON competencies;
CREATE POLICY "Anyone can view competencies"
ON competencies FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage competencies" ON competencies;
CREATE POLICY "Admins can manage competencies"
ON competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'curriculum_designer')
));

-- ============================================================================
-- COURSE/LESSON COMPETENCIES RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view course competencies" ON course_competencies;
CREATE POLICY "Anyone can view course competencies"
ON course_competencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage course competencies" ON course_competencies;
CREATE POLICY "Admins can manage course competencies"
ON course_competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

DROP POLICY IF EXISTS "Anyone can view lesson competencies" ON lesson_competencies;
CREATE POLICY "Anyone can view lesson competencies"
ON lesson_competencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage lesson competencies" ON lesson_competencies;
CREATE POLICY "Admins can manage lesson competencies"
ON lesson_competencies FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor', 'curriculum_designer')
));

-- ============================================================================
-- STUDENT COMPETENCIES RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own competencies" ON student_competencies;
CREATE POLICY "Users can view own competencies"
ON student_competencies FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "System can manage student competencies" ON student_competencies;
CREATE POLICY "System can manage student competencies"
ON student_competencies FOR ALL
USING (true);

-- ============================================================================
-- ADAPTIVE RULES RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view active adaptive rules" ON adaptive_rules;
CREATE POLICY "Anyone can view active adaptive rules"
ON adaptive_rules FOR SELECT
USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Instructors can manage adaptive rules" ON adaptive_rules;
CREATE POLICY "Instructors can manage adaptive rules"
ON adaptive_rules FOR ALL
USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

-- ============================================================================
-- STUDENT RECOMMENDATIONS RLS FIX
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can view own recommendations"
ON student_adaptive_recommendations FOR SELECT
USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin', 'instructor')
));

DROP POLICY IF EXISTS "Users can update own recommendations" ON student_adaptive_recommendations;
CREATE POLICY "Users can update own recommendations"
ON student_adaptive_recommendations FOR UPDATE
USING (student_id = auth.uid());

-- ============================================================================
-- DONE
-- ============================================================================
