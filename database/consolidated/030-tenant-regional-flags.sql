-- ============================================================================
-- Part 30: Per-tenant regional participation flags
-- ============================================================================
-- Depends on: 001 (tenants)
-- ============================================================================
-- Adds governance switches so each institution can opt in/out of:
--   * publishing courses to the whole network (network-wide shares)
--   * consuming shared courses from other institutions
--   * accepting credit-transfer submissions from their students
--   * allowing their students to submit credits to other institutions
-- Default is TRUE for all flags so existing behavior is preserved.
-- ============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS regional_catalogue_publish_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS regional_catalogue_consume_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS credit_transfer_accept_enabled    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS credit_transfer_issue_enabled     BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tenants.regional_catalogue_publish_enabled IS
  'If false, this tenant cannot publish courses network-wide via course_shares(target_tenant_id=NULL).';
COMMENT ON COLUMN public.tenants.regional_catalogue_consume_enabled IS
  'If false, this tenant''s students do not see shared courses from other tenants.';
COMMENT ON COLUMN public.tenants.credit_transfer_accept_enabled IS
  'If false, students cannot submit credit_records for review at this tenant.';
COMMENT ON COLUMN public.tenants.credit_transfer_issue_enabled IS
  'If false, this tenant''s courses cannot be cited as the issuing_tenant_id on in_network credit submissions elsewhere.';
