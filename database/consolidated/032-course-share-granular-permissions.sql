-- ============================================================================
-- Part 32: Granular course-share permissions + fork provenance
-- ============================================================================
-- Depends on: 014 (course_shares), 002 (courses)
-- ============================================================================
-- Replaces the binary permission enum ('enroll' | 'view_only') with granular
-- boolean flags so a source tenant can delegate specific rights on a per-share
-- basis: enrolling students, supplementing with local content, scheduling live
-- sessions, posting grades, and whether the target tenant can fork the course
-- into its own tenancy.
--
-- Also adds forked_from_course_id / forked_from_tenant_id columns on courses
-- so we can show provenance ("Forked from {Institution}") on target courses.
-- These are intentionally unconstrained cross-tenant references — if the
-- source is deleted the provenance just becomes "Forked from a removed
-- source", which is fine.
-- ============================================================================

-- ── New permission flags on course_shares ──────────────────────────────────
ALTER TABLE public.course_shares
  ADD COLUMN IF NOT EXISTS can_enroll                     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_add_supplemental_content   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_schedule_live_sessions     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_post_grades                BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_fork                     BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.course_shares.can_enroll IS
  'Target tenant students can enrol in the course.';
COMMENT ON COLUMN public.course_shares.can_add_supplemental_content IS
  'Target tenant instructors can attach local lessons/resources/conferences visible to their cohort.';
COMMENT ON COLUMN public.course_shares.can_schedule_live_sessions IS
  'Target tenant instructors can schedule video conferences against the shared course.';
COMMENT ON COLUMN public.course_shares.can_post_grades IS
  'Target tenant instructors can grade assessments for their enrolled students.';
COMMENT ON COLUMN public.course_shares.allow_fork IS
  'Target tenant admins may clone the course into their own tenancy.';

-- ── Backfill flags from the existing permission column ────────────────────
-- permission='enroll' -> can_enroll; 'view_only' -> nothing
UPDATE public.course_shares
SET can_enroll = true
WHERE permission = 'enroll' AND can_enroll = false;

-- ── Relax the permission CHECK so the old column can still be set ──────────
-- Keep it around as a legacy summary column for now; API will stop writing to
-- it once clients switch to the flags.
ALTER TABLE public.course_shares
  DROP CONSTRAINT IF EXISTS course_shares_permission_check;
ALTER TABLE public.course_shares
  ADD CONSTRAINT course_shares_permission_check
    CHECK (permission IN ('enroll', 'view_only', 'granular'));

-- ── Fork provenance on courses ─────────────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS forked_from_course_id UUID,
  ADD COLUMN IF NOT EXISTS forked_from_tenant_id UUID,
  ADD COLUMN IF NOT EXISTS forked_at             TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courses_forked_from_course
  ON public.courses(forked_from_course_id)
  WHERE forked_from_course_id IS NOT NULL;

COMMENT ON COLUMN public.courses.forked_from_course_id IS
  'Source course this one was forked from (cross-tenant; no FK so source deletion does not block).';
COMMENT ON COLUMN public.courses.forked_from_tenant_id IS
  'Source tenant of the fork (cross-tenant; no FK on purpose).';
