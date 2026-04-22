import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { validateCourseShare } from '@/lib/share-validation';

/**
 * POST /api/shared-courses/[id]/accept
 * The target tenant's admin accepts a shared course. After acceptance, the
 * course appears in the tenant's catalogue and students can enrol.
 *
 * Requires: admin, tenant_admin, or super_admin role in the accepting tenant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, ['super_admin', 'tenant_admin', 'admin'])) {
      return NextResponse.json(
        { error: 'Only tenant admins can accept a shared course' },
        { status: 403 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);

    // Reuse validation (ensures share exists, is non-revoked, is accessible by
    // this tenant, and is not from the caller's own tenant).
    const validation = await validateCourseShare(shareId, tenantId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 404 });
    }

    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq.raw
      .from('shared_course_acceptances')
      .upsert(
        {
          course_share_id: shareId,
          accepting_tenant_id: tenantId,
          status: 'accepted',
          accepted_by: authResult.user!.id,
          accepted_at: new Date().toISOString(),
          // Clear any previous decline
          declined_by: null,
          declined_at: null,
          decline_reason: null,
        },
        { onConflict: 'course_share_id,accepting_tenant_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Share accept error:', error);
      return NextResponse.json({ error: 'Failed to accept share' }, { status: 500 });
    }

    return NextResponse.json({ acceptance: data });
  } catch (error) {
    console.error('Share accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
