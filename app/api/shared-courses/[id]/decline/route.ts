import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { validateCourseShare } from '@/lib/share-validation';

/**
 * POST /api/shared-courses/[id]/decline
 * The target tenant's admin declines a shared course. The share stays
 * visible in the admin's incoming queue so it can be reconsidered later,
 * but the course does not appear in the catalogue.
 *
 * Body: { reason? }
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
        { error: 'Only tenant admins can decline a shared course' },
        { status: 403 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);

    const validation = await validateCourseShare(shareId, tenantId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 404 });
    }

    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body?.reason ? String(body.reason).slice(0, 500) : null;
    } catch {
      // no body is fine
    }

    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq.raw
      .from('shared_course_acceptances')
      .upsert(
        {
          course_share_id: shareId,
          accepting_tenant_id: tenantId,
          status: 'declined',
          declined_by: authResult.user!.id,
          declined_at: new Date().toISOString(),
          decline_reason: reason,
          // Clear any previous acceptance
          accepted_by: null,
          accepted_at: null,
        },
        { onConflict: 'course_share_id,accepting_tenant_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Share decline error:', error);
      return NextResponse.json({ error: 'Failed to decline share' }, { status: 500 });
    }

    return NextResponse.json({ acceptance: data });
  } catch (error) {
    console.error('Share decline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
