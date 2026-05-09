-- ============================================================================
-- Part 55: Backfill missing tenant_memberships for existing users
-- ============================================================================
-- Depends on: 001 (users, tenant_memberships)
-- ============================================================================
-- Diagnostic 10 surfaced users with a public.users row but no
-- tenant_memberships row. They can sign in (the admin user list at
-- /api/admin/users filters by users.tenant_id directly), but any panel
-- that joins through tenant_memberships treats them as missing — which
-- in CourseEnrollmentsPanel renders as "Unknown User."
--
-- The provisioning gap was in lib/user-provisioning.ts, where the
-- tenant_memberships insert ran without an error check. Users created
-- through paths where that insert silently failed (e.g. transient errors,
-- or flows that pre-dated the multi-tenancy migrations) ended up here.
--
-- This migration creates a primary membership for every user in their
-- own users.tenant_id, using the role already on users.role so admins/
-- instructors don't get demoted to student.
--
-- Idempotent: NOT EXISTS skips users that already have any membership;
-- ON CONFLICT covers the (tenant_id, user_id) UNIQUE in case of races.
-- Safe to re-run.
-- ============================================================================

INSERT INTO public.tenant_memberships (tenant_id, user_id, role, is_primary)
SELECT
  u.tenant_id,
  u.id,
  u.role,
  true
FROM public.users u
LEFT JOIN public.tenant_memberships tm ON tm.user_id = u.id
WHERE tm.user_id IS NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;
