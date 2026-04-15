-- ============================================================================
-- Part 23: Security & Data Integrity Fixes
-- ============================================================================
-- Addresses:
-- P0: RLS tenant bypass on library_resources, video_comments, whiteboards
-- P0: Content locking enforcement in RLS
-- P1: Dual enrollment vulnerability
-- P2: Cron job distributed locking table
-- ============================================================================

-- ============================================================================
-- 1. FIX LIBRARY RESOURCES RLS — add tenant_id guard to SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS lib_res_cat_select ON public.library_resource_categories;
CREATE POLICY lib_res_cat_select ON public.library_resource_categories
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS lib_res_select ON public.library_resources;
CREATE POLICY lib_res_select ON public.library_resources
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS lib_res_ver_select ON public.library_resource_versions;
CREATE POLICY lib_res_ver_select ON public.library_resource_versions
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS clr_select ON public.course_library_resources;
CREATE POLICY clr_select ON public.course_library_resources
  FOR SELECT USING (tenant_id = current_tenant_id());

-- Also fix the FOR ALL policies to include tenant_id guard
DROP POLICY IF EXISTS lib_res_cat_all ON public.library_resource_categories;
CREATE POLICY lib_res_cat_all ON public.library_resource_categories
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

DROP POLICY IF EXISTS lib_res_all ON public.library_resources;
CREATE POLICY lib_res_all ON public.library_resources
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

DROP POLICY IF EXISTS lib_res_ver_all ON public.library_resource_versions;
CREATE POLICY lib_res_ver_all ON public.library_resource_versions
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );

DROP POLICY IF EXISTS clr_all ON public.course_library_resources;
CREATE POLICY clr_all ON public.course_library_resources
  FOR ALL USING (
    tenant_id = current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer')
    )
  );


-- ============================================================================
-- 2. FIX VIDEO COMMENTS RLS — add tenant_id guard
-- ============================================================================

DROP POLICY IF EXISTS video_comments_select ON public.video_comments;
CREATE POLICY video_comments_select ON public.video_comments
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS video_comments_insert ON public.video_comments;
CREATE POLICY video_comments_insert ON public.video_comments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS video_comments_update ON public.video_comments;
CREATE POLICY video_comments_update ON public.video_comments
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS video_comments_delete ON public.video_comments;
CREATE POLICY video_comments_delete ON public.video_comments
  FOR DELETE USING (
    tenant_id = current_tenant_id() AND (
      author_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'tenant_admin', 'admin', 'instructor')
      )
    )
  );


-- ============================================================================
-- 3. FIX WHITEBOARDS RLS — add tenant_id guard to all policies
-- ============================================================================

DROP POLICY IF EXISTS whiteboards_select ON public.whiteboards;
CREATE POLICY whiteboards_select ON public.whiteboards FOR SELECT
  USING (
    tenant_id = current_tenant_id() AND (
      created_by = auth.uid()
      OR visibility = 'public'
      OR visibility = 'shared'
      OR (visibility = 'course' AND course_id IN (
        SELECT course_id FROM enrollments WHERE student_id = auth.uid()
        UNION
        SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS whiteboards_insert ON public.whiteboards;
CREATE POLICY whiteboards_insert ON public.whiteboards FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND created_by = auth.uid());

DROP POLICY IF EXISTS whiteboards_update ON public.whiteboards;
CREATE POLICY whiteboards_update ON public.whiteboards FOR UPDATE
  USING (tenant_id = current_tenant_id() AND created_by = auth.uid());

DROP POLICY IF EXISTS whiteboards_delete ON public.whiteboards;
CREATE POLICY whiteboards_delete ON public.whiteboards FOR DELETE
  USING (tenant_id = current_tenant_id() AND created_by = auth.uid());

-- Whiteboard versions: tenant-guarded via parent board
DROP POLICY IF EXISTS wb_versions_select ON public.whiteboard_versions;
CREATE POLICY wb_versions_select ON public.whiteboard_versions FOR SELECT
  USING (
    whiteboard_id IN (
      SELECT id FROM whiteboards WHERE tenant_id = current_tenant_id()
    )
  );

DROP POLICY IF EXISTS wb_versions_insert ON public.whiteboard_versions;
CREATE POLICY wb_versions_insert ON public.whiteboard_versions FOR INSERT
  WITH CHECK (
    whiteboard_id IN (
      SELECT id FROM whiteboards
      WHERE tenant_id = current_tenant_id() AND created_by = auth.uid()
    )
  );

-- Conference whiteboards: tenant-guarded
DROP POLICY IF EXISTS conf_wb_select ON public.conference_whiteboards;
CREATE POLICY conf_wb_select ON public.conference_whiteboards FOR SELECT
  USING (
    tenant_id = current_tenant_id()
  );

DROP POLICY IF EXISTS conf_wb_insert ON public.conference_whiteboards;
CREATE POLICY conf_wb_insert ON public.conference_whiteboards FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND added_by = auth.uid());

DROP POLICY IF EXISTS conf_wb_update ON public.conference_whiteboards;
CREATE POLICY conf_wb_update ON public.conference_whiteboards FOR UPDATE
  USING (tenant_id = current_tenant_id() AND added_by = auth.uid());

DROP POLICY IF EXISTS conf_wb_delete ON public.conference_whiteboards;
CREATE POLICY conf_wb_delete ON public.conference_whiteboards FOR DELETE
  USING (tenant_id = current_tenant_id() AND added_by = auth.uid());


-- ============================================================================
-- 4. ENFORCE CONTENT LOCKING IN RLS
-- ============================================================================
-- Prevent non-admin users from updating locked lessons.
-- The existing lessons RLS policies allow instructors to update any lesson
-- in their course. We add a specific policy that blocks updates to locked rows
-- unless the user is an admin.
--
-- Strategy: Drop and recreate the lessons UPDATE policy to include lock check.
-- We use current_user_role() (created in 018) to avoid RLS recursion on users.

-- First, create a specific policy for lesson updates that respects locking.
-- This works alongside the existing FOR ALL policies by adding a more specific
-- UPDATE restriction.

DROP POLICY IF EXISTS lessons_lock_guard ON public.lessons;
CREATE POLICY lessons_lock_guard ON public.lessons
  FOR UPDATE USING (
    -- Unlocked lessons: anyone with existing update permission can edit
    locked = false
    OR
    -- Locked lessons: only admins can edit
    current_user_role() IN ('super_admin', 'tenant_admin', 'admin')
  );


-- ============================================================================
-- 5. FIX DUAL ENROLLMENT VULNERABILITY
-- ============================================================================
-- The partial indexes in 016 allow a student to be enrolled in the same course
-- twice: once without a cohort (class_id IS NULL) and once with a cohort.
-- Replace with a single unique constraint on (student_id, course_id).

DROP INDEX IF EXISTS enrollments_student_course_no_cohort;
DROP INDEX IF EXISTS enrollments_student_course_cohort;

-- One enrollment per student per course, regardless of cohort assignment
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_unique
  ON enrollments(student_id, course_id);

-- Separate index for cohort uniqueness (a student can only be in one cohort per course)
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_cohort_unique
  ON enrollments(student_id, class_id) WHERE class_id IS NOT NULL;


-- ============================================================================
-- 6. CRON JOB DISTRIBUTED LOCKING TABLE
-- ============================================================================
-- Prevents duplicate cron executions in serverless environments.

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_status ON cron_runs(job_name, status);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON cron_runs(started_at DESC);

-- Auto-clean old cron run records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_cron_runs()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM cron_runs WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- RLS for cron_runs (service role only, no user access needed)
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — only service role (which bypasses RLS) accesses this table


-- ============================================================================
-- 7. HEALTH CHECK — lightweight function for connection validation
-- ============================================================================

CREATE OR REPLACE FUNCTION health_check()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'status', 'ok',
    'timestamp', NOW()::text,
    'version', current_setting('server_version')
  );
$$;
