import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// PUT /api/conferences/[id]/whiteboards/[wbId] — Update conference whiteboard settings (e.g., activate)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wbId: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: conferenceId, wbId } = await params;
    const body = await request.json();

    // Verify conference instructor or admin
    const { data: conference } = await tq
      .from('video_conferences')
      .select('instructor_id')
      .eq('id', conferenceId)
      .single();

    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(userProfile.role);

    if (!conference || (conference.instructor_id !== userProfile.id && !isAdmin)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { is_active, collaboration, available_from, sort_order } = body;
    const updates: Record<string, any> = {};

    if (is_active !== undefined) {
      updates.is_active = is_active;

      // If activating this board, deactivate all others for this conference
      if (is_active) {
        await tq
          .from('conference_whiteboards')
          .update({ is_active: false })
          .eq('conference_id', conferenceId)
          .neq('id', wbId);
      }
    }
    if (collaboration !== undefined) updates.collaboration = collaboration;
    if (available_from !== undefined) updates.available_from = available_from;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data: updated, error } = await tq
      .from('conference_whiteboards')
      .update(updates)
      .eq('id', wbId)
      .eq('conference_id', conferenceId)
      .select(`
        *,
        whiteboard:whiteboards(id, title, description, thumbnail_url)
      `)
      .single();

    if (error) {
      console.error('Error updating conference whiteboard:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in conference whiteboard PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/conferences/[id]/whiteboards/[wbId] — Detach a whiteboard from a conference
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; wbId: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id: conferenceId, wbId } = await params;

    const { error } = await tq
      .from('conference_whiteboards')
      .delete()
      .eq('id', wbId)
      .eq('conference_id', conferenceId);

    if (error) {
      console.error('Error detaching whiteboard:', error);
      return NextResponse.json({ error: 'Failed to detach whiteboard' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Whiteboard detached' });
  } catch (error) {
    console.error('Error in conference whiteboard DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
