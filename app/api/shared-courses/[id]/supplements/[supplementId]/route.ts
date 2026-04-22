import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { validateCourseShare } from '@/lib/share-validation';

const EDITABLE_FIELDS = [
  'title',
  'description',
  'body',
  'url',
  'link_type',
  'icon',
  'position',
  'published',
] as const;

/**
 * PATCH /api/shared-courses/[id]/supplements/[supplementId]
 * Update a supplement. Caller must be staff in the target tenant with
 * can_add_supplemental_content.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplementId: string }> }
) {
  try {
    const { id: shareId, supplementId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin',
      'tenant_admin',
      'admin',
      'instructor',
      'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await validateCourseShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });
    if (!validation.share!.can_add_supplemental_content) {
      return NextResponse.json(
        { error: 'Supplemental content is not enabled for this share' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await tq
      .from('shared_course_supplements')
      .update(updates)
      .eq('id', supplementId)
      .eq('course_share_id', shareId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update supplement' }, { status: 500 });
    }

    return NextResponse.json({ supplement: data });
  } catch (error) {
    console.error('Supplement PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/shared-courses/[id]/supplements/[supplementId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; supplementId: string }> }
) {
  try {
    const { id: shareId, supplementId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin',
      'tenant_admin',
      'admin',
      'instructor',
      'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('shared_course_supplements')
      .delete()
      .eq('id', supplementId)
      .eq('course_share_id', shareId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete supplement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplement DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
