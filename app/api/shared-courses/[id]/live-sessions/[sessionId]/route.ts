import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { requireAcceptedShare } from '@/lib/share-validation';

const PROVIDERS = ['zoom', 'teams', 'meet', 'jitsi', 'other'] as const;
const STATUSES = ['scheduled', 'live', 'completed', 'cancelled'] as const;

/**
 * PATCH /api/shared-courses/[id]/live-sessions/[sessionId]
 * Update a scheduled session. Staff only; share.can_schedule_live_sessions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: shareId, sessionId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await requireAcceptedShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });
    if (!validation.share!.can_schedule_live_sessions) {
      return NextResponse.json(
        { error: 'Live sessions are not enabled for this share' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = String(body.title).slice(0, 500);
    if (body.description !== undefined) updates.description = body.description ? String(body.description) : null;
    if (body.scheduled_at !== undefined) {
      if (isNaN(Date.parse(body.scheduled_at))) {
        return NextResponse.json({ error: 'scheduled_at must be a valid ISO timestamp' }, { status: 400 });
      }
      updates.scheduled_at = new Date(body.scheduled_at).toISOString();
    }
    if (body.duration_minutes !== undefined) {
      const d = Number(body.duration_minutes);
      if (!Number.isFinite(d) || d <= 0 || d > 600) {
        return NextResponse.json({ error: 'duration_minutes must be between 1 and 600' }, { status: 400 });
      }
      updates.duration_minutes = d;
    }
    if (body.meeting_url !== undefined) updates.meeting_url = body.meeting_url ? String(body.meeting_url).slice(0, 1000) : null;
    if (body.provider !== undefined) {
      if (!PROVIDERS.includes(body.provider)) {
        return NextResponse.json({ error: `provider must be one of ${PROVIDERS.join(', ')}` }, { status: 400 });
      }
      updates.provider = body.provider;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await tq
      .from('shared_course_live_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('course_share_id', shareId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Live session PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/shared-courses/[id]/live-sessions/[sessionId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: shareId, sessionId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('shared_course_live_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('course_share_id', shareId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Live session DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
