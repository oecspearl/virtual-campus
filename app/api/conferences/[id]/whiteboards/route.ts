import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';

// GET /api/conferences/[id]/whiteboards — List whiteboards attached to a conference
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
    const { id: conferenceId } = await params;

    const { data: conferenceWhiteboards, error } = await tq
      .from('conference_whiteboards')
      .select(`
        *,
        whiteboard:whiteboards(
          id, title, description, thumbnail_url, elements, app_state, frames,
          collaboration, visibility, created_by, is_template,
          creator:users!whiteboards_created_by_fkey(id, name, email)
        )
      `)
      .eq('conference_id', conferenceId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching conference whiteboards:', error);
      return NextResponse.json({ error: 'Failed to fetch whiteboards' }, { status: 500 });
    }

    return NextResponse.json({ whiteboards: conferenceWhiteboards || [] });
  } catch (error) {
    console.error('Error in conference whiteboards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conferences/[id]/whiteboards — Attach a whiteboard to a conference
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
    const { id: conferenceId } = await params;
    const body = await request.json();
    const {
      whiteboard_id,
      collaboration = 'collaborate',
      available_from = 'on_join',
      sort_order = 0,
      // If creating a new board inline
      create_new,
      title,
    } = body;

    // Verify conference exists and user is instructor/admin
    const { data: conference, error: confError } = await tq
      .from('video_conferences')
      .select('id, instructor_id, course_id')
      .eq('id', conferenceId)
      .single();

    if (confError || !conference) {
      return NextResponse.json({ error: 'Conference not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(userProfile.role);

    if (conference.instructor_id !== userProfile.id && !isAdmin) {
      return NextResponse.json({ error: 'Only the instructor or admin can attach whiteboards' }, { status: 403 });
    }

    let boardId = whiteboard_id;

    // Create a new whiteboard inline if requested
    if (create_new) {
      const { data: newBoard, error: createError } = await tq
        .from('whiteboards')
        .insert({
          tenant_id: tenantId,
          created_by: userProfile.id,
          title: title || 'Conference Board',
          elements: [],
          app_state: {},
          frames: [],
          visibility: 'course',
          course_id: conference.course_id,
          collaboration,
          auto_snapshot: true,
        })
        .select()
        .single();

      if (createError || !newBoard) {
        console.error('Error creating whiteboard:', createError);
        return NextResponse.json({ error: 'Failed to create whiteboard' }, { status: 500 });
      }

      boardId = newBoard.id;
    }

    if (!boardId) {
      return NextResponse.json({ error: 'whiteboard_id is required' }, { status: 400 });
    }

    // Attach whiteboard to conference
    const { data: link, error: linkError } = await tq
      .from('conference_whiteboards')
      .insert({
        tenant_id: tenantId,
        conference_id: conferenceId,
        whiteboard_id: boardId,
        added_by: userProfile.id,
        collaboration,
        available_from,
        sort_order,
      })
      .select(`
        *,
        whiteboard:whiteboards(
          id, title, description, thumbnail_url, elements, app_state, frames,
          collaboration, visibility, created_by,
          creator:users!whiteboards_created_by_fkey(id, name, email)
        )
      `)
      .single();

    if (linkError) {
      console.error('Error attaching whiteboard:', linkError);
      if (linkError.code === '23505') {
        return NextResponse.json({ error: 'This whiteboard is already attached to this conference' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to attach whiteboard' }, { status: 500 });
    }

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error in conference whiteboards POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
