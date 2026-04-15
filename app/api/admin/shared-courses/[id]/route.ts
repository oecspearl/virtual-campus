import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

/**
 * DELETE /api/admin/shared-courses/[id]
 * Revoke a course share (soft-delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const { id: shareId } = await params;

    const tq = createTenantQuery(tenantId);

    // Verify the share belongs to this tenant
    const { data: share, error: fetchError } = await tq.raw
      .from('course_shares')
      .select('id, source_tenant_id, revoked_at')
      .eq('id', shareId)
      .single();

    if (fetchError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.source_tenant_id !== tenantId) {
      return NextResponse.json({ error: 'You can only revoke shares from your own tenant' }, { status: 403 });
    }

    if (share.revoked_at) {
      return NextResponse.json({ error: 'Share is already revoked' }, { status: 400 });
    }

    // Soft-delete by setting revoked_at
    const { error: revokeError } = await tq.raw
      .from('course_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', shareId);

    if (revokeError) {
      console.error('Error revoking share:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Error in shared courses DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/shared-courses/[id]
 * Update share permission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const { id: shareId } = await params;
    const body = await request.json();

    const tq = createTenantQuery(tenantId);

    // Verify ownership
    const { data: share } = await tq.raw
      .from('course_shares')
      .select('id, source_tenant_id')
      .eq('id', shareId)
      .single();

    if (!share || share.source_tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (body.permission && ['enroll', 'view_only'].includes(body.permission)) {
      updates.permission = body.permission;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data: updated, error } = await tq.raw
      .from('course_shares')
      .update(updates)
      .eq('id', shareId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 });
    }

    return NextResponse.json({ share: updated });
  } catch (error) {
    console.error('Error in shared courses PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
