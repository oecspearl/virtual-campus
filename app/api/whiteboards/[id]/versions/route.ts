import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// GET /api/whiteboards/[id]/versions — List all versions of a whiteboard
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

    const { data: versions, error } = await tq
      .from('whiteboard_versions')
      .select('id, whiteboard_id, saved_by, label, thumbnail_url, created_at, saver:users!whiteboard_versions_saved_by_fkey(id, name)')
      .eq('whiteboard_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (error) {
    console.error('Error in versions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/whiteboards/[id]/versions — Save a version snapshot
export async function POST(
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
    const { label } = body;

    // Get current whiteboard state
    const { data: whiteboard, error: wbError } = await tq
      .from('whiteboards')
      .select('elements, app_state, frames, created_by')
      .eq('id', id)
      .single();

    if (wbError || !whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    // Owner or admin can save versions
    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(userProfile.role);
    if (whiteboard.created_by !== userProfile.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { data: version, error } = await tq
      .from('whiteboard_versions')
      .insert({
        whiteboard_id: id,
        saved_by: userProfile.id,
        label: label || `Saved ${new Date().toLocaleString()}`,
        elements: whiteboard.elements,
        app_state: whiteboard.app_state,
        frames: whiteboard.frames,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving version:', error);
      return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
    }

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Error in versions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
