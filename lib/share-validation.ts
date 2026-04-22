import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Validates that a course share is still active before allowing content access.
 *
 * Used by shared course API routes to enforce that revoked shares
 * actually block access — the RLS policies on lessons/quizzes/assignments
 * don't inherently check course_shares, so this fills that gap.
 */

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
    },
  };
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
    },
  };
}
