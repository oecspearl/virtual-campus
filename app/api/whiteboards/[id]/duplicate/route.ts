import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// POST /api/whiteboards/[id]/duplicate — Duplicate a whiteboard
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
    const body = await request.json().catch(() => ({}));
    const { title: newTitle, course_id } = body;

    // Get the source whiteboard
    const { data: source, error: sourceError } = await tq
      .from('whiteboards')
      .select('*')
      .eq('id', id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    // Create a copy
    const { data: duplicate, error } = await tq
      .from('whiteboards')
      .insert({
        tenant_id: tenantId,
        created_by: userProfile.id,
        title: newTitle || `${source.title} (Copy)`,
        description: source.description,
        elements: source.elements,
        app_state: source.app_state,
        frames: source.frames,
        visibility: 'private',
        course_id: course_id || null,
        collaboration: source.collaboration,
        is_template: false,
        auto_snapshot: source.auto_snapshot,
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating whiteboard:', error);
      return NextResponse.json({ error: 'Failed to duplicate whiteboard' }, { status: 500 });
    }

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error('Error in whiteboard duplicate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
