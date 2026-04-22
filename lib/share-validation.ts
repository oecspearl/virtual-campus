import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Validates that a course share is still active before allowing content access.
 *
 * Used by shared course API routes to enforce that revoked shares
 * actually block access — the RLS policies on lessons/quizzes/assignments
 * don't inherently check course_shares, so this fills that gap.
 */

export type AcceptanceStatus = 'pending' | 'accepted' | 'declined' | 'none';

interface ShareValidationResult {
  valid: boolean;
  share?: {
    id: string;
    course_id: string;
    source_tenant_id: string;
    permission: string;
    can_enroll: boolean;
    can_add_supplemental_content: boolean;
    can_schedule_live_sessions: boolean;
    can_post_grades: boolean;
    allow_fork: boolean;
    /** The caller's tenant's current acceptance state for this share. */
    acceptance_status: AcceptanceStatus;
  };
  error?: string;
}

/**
 * Validate that a course share exists, is not revoked, and is accessible
 * by the requesting tenant.
 */
export async function validateCourseShare(
  shareId: string,
  requestingTenantId: string
): Promise<ShareValidationResult> {
  const supabase = createServiceSupabaseClient();

  const { data: share, error } = await supabase
    .from('course_shares')
    .select('id, course_id, source_tenant_id, permission, can_enroll, can_add_supplemental_content, can_schedule_live_sessions, can_post_grades, allow_fork, revoked_at, target_tenant_id')
    .eq('id', shareId)
    .single();

  if (error || !share) {
    return { valid: false, error: 'Share not found' };
  }

  // Check if share has been revoked
  if (share.revoked_at) {
    return { valid: false, error: 'This course share has been revoked' };
  }

  // Check if requesting tenant is authorized
  if (share.target_tenant_id !== null && share.target_tenant_id !== requestingTenantId) {
    return { valid: false, error: 'Share not available for your institution' };
  }

  // Don't let source tenant access via share endpoint (they use normal endpoints)
  if (share.source_tenant_id === requestingTenantId) {
    return { valid: false, error: 'Use the course directly — you are the source tenant' };
  }

  // Fetch current acceptance status for the requesting tenant (if any)
  const acceptanceStatus = await fetchAcceptanceStatus(supabase, share.id, requestingTenantId);

  return {
    valid: true,
    share: {
      id: share.id,
      course_id: share.course_id,
      source_tenant_id: share.source_tenant_id,
      permission: share.permission,
      can_enroll: share.can_enroll ?? share.permission === 'enroll',
      can_add_supplemental_content: !!share.can_add_supplemental_content,
      can_schedule_live_sessions: !!share.can_schedule_live_sessions,
      can_post_grades: !!share.can_post_grades,
      allow_fork: !!share.allow_fork,
      acceptance_status: acceptanceStatus,
    },
  };
}

/**
 * Helper for content-consuming flows: require the share to be accepted by
 * the caller's tenant. Returns the same shape as validateCourseShare but with
 * a 403-equivalent error when acceptance_status !== 'accepted'.
 */
export async function requireAcceptedShare(
  shareId: string,
  requestingTenantId: string
): Promise<ShareValidationResult> {
  const validation = await validateCourseShare(shareId, requestingTenantId);
  if (!validation.valid) return validation;
  if (validation.share!.acceptance_status !== 'accepted') {
    return {
      valid: false,
      error: 'This shared course has not yet been accepted by your institution',
    };
  }
  return validation;
}

/**
 * Read acceptance status for a (share, tenant) pair. Returns 'none' if no
 * acceptance row exists yet (typical for network-wide shares a tenant hasn't
 * interacted with).
 */
async function fetchAcceptanceStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  shareId: string,
  tenantId: string
): Promise<AcceptanceStatus> {
  const { data } = await supabase
    .from('shared_course_acceptances')
    .select('status')
    .eq('course_share_id', shareId)
    .eq('accepting_tenant_id', tenantId)
    .maybeSingle();
  if (!data) return 'none';
  const status = data.status as AcceptanceStatus;
  return status === 'pending' || status === 'accepted' || status === 'declined' ? status : 'none';
}

/**
 * Validate that a course share for a specific course_id is still active.
 * Used when accessing content by course_id rather than share_id.
 */
export async function validateCourseShareByCourse(
  courseId: string,
  requestingTenantId: string
): Promise<ShareValidationResult> {
  const supabase = createServiceSupabaseClient();

  const { data: share, error } = await supabase
    .from('course_shares')
    .select('id, course_id, source_tenant_id, permission, can_enroll, can_add_supplemental_content, can_schedule_live_sessions, can_post_grades, allow_fork, revoked_at, target_tenant_id')
    .eq('course_id', courseId)
    .is('revoked_at', null)
    .or(`target_tenant_id.is.null,target_tenant_id.eq.${requestingTenantId}`)
    .limit(1)
    .single();

  if (error || !share) {
    return { valid: false, error: 'No active share found for this course' };
  }

  const acceptanceStatus = await fetchAcceptanceStatus(supabase, share.id, requestingTenantId);
  return {
    valid: true,
    share: {
      id: share.id,
      course_id: share.course_id,
      source_tenant_id: share.source_tenant_id,
      permission: share.permission,
      can_enroll: share.can_enroll ?? share.permission === 'enroll',
      can_add_supplemental_content: !!share.can_add_supplemental_content,
      can_schedule_live_sessions: !!share.can_schedule_live_sessions,
      can_post_grades: !!share.can_post_grades,
      allow_fork: !!share.allow_fork,
      acceptance_status: acceptanceStatus,
    },
  };
}
