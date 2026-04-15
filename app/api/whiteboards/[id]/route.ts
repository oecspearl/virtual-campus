import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// GET /api/whiteboards/[id] — Get a single whiteboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id } = await params;

    const { data: whiteboard, error } = await tq
      .from('whiteboards')
      .select('*, creator:users!whiteboards_created_by_fkey(id, name, email, avatar_url)')
      .eq('id', id)
      .single();

    if (error || !whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    return NextResponse.json(whiteboard);
  } catch (error) {
    console.error('Error in whiteboard GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/whiteboards/[id] — Update a whiteboard
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id } = await params;
    const body = await request.json();

    // Verify ownership or admin role
    const { data: existing, error: fetchError } = await tq
      .from('whiteboards')
      .select('created_by, collaboration')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(userProfile.role);
    const isOwner = existing.created_by === userProfile.id;
    const isCollaborateMode = existing.collaboration === 'collaborate';

    // Allow save if: owner, admin, or board is in collaborate mode
    if (!isOwner && !isAdmin && !isCollaborateMode) {
      return NextResponse.json({ error: 'Not authorized to edit this whiteboard' }, { status: 403 });
    }

    const allowedFields = [
      'title', 'description', 'elements', 'app_state', 'frames',
      'visibility', 'course_id', 'lesson_id', 'collaboration',
      'is_template', 'auto_snapshot', 'archived', 'thumbnail_url'
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: whiteboard, error } = await tq
      .from('whiteboards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating whiteboard:', error);
      return NextResponse.json({ error: 'Failed to update whiteboard' }, { status: 500 });
    }

    return NextResponse.json(whiteboard);
  } catch (error) {
    console.error('Error in whiteboard PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/whiteboards/[id] — Delete a whiteboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { id } = await params;

    // Verify ownership or admin role
    const { data: existing, error: fetchError } = await tq
      .from('whiteboards')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(userProfile.role);
    if (existing.created_by !== userProfile.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this whiteboard' }, { status: 403 });
    }

    // Delete versions first, then the whiteboard
    await tq.from('whiteboard_versions').delete().eq('whiteboard_id', id);
    await tq.from('conference_whiteboards').delete().eq('whiteboard_id', id);

    const { error } = await tq
      .from('whiteboards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting whiteboard:', error);
      return NextResponse.json({ error: 'Failed to delete whiteboard' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Whiteboard deleted' });
  } catch (error) {
    console.error('Error in whiteboard DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
