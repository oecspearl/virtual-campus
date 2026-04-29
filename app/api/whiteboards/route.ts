import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser } from '@/lib/api-auth';
import { requireCourseAccess } from '@/lib/enrollment-check';

// GET /api/whiteboards — List whiteboards for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const filter = searchParams.get('filter'); // 'mine', 'templates', 'archived', 'course'
    const search = searchParams.get('search');

    let query = tq
      .from('whiteboards')
      .select('*, creator:users!whiteboards_created_by_fkey(id, name, email)')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    // Apply filters
    switch (filter) {
      case 'templates':
        query = query.eq('is_template', true).eq('archived', false);
        break;
      case 'archived':
        query = query.eq('archived', true);
        break;
      case 'course': {
        if (!courseId) {
          return NextResponse.json({ error: 'course_id is required for course filter' }, { status: 400 });
        }
        // Listing course-scoped boards requires enrollment (or staff / public course).
        const access = await requireCourseAccess(
          { id: userProfile.id, role: userProfile.role },
          courseId,
        );
        if (!access.allowed) {
          return NextResponse.json({ error: access.reason }, { status: access.status });
        }
        query = query.eq('course_id', courseId).eq('archived', false);
        break;
      }
      default:
        // 'mine' or no filter — show user's non-archived boards
        query = query.eq('created_by', userProfile.id).eq('archived', false);
        break;
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: whiteboards, error } = await query;

    if (error) {
      console.error('Error fetching whiteboards:', error);
      return NextResponse.json({ error: 'Failed to fetch whiteboards' }, { status: 500 });
    }

    return NextResponse.json({ whiteboards: whiteboards || [] });
  } catch (error) {
    console.error('Error in whiteboards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/whiteboards — Create a new whiteboard
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { userProfile } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const body = await request.json();
    const {
      title = 'Untitled Board',
      description,
      elements = [],
      app_state = {},
      frames = [],
      visibility = 'private',
      course_id,
      lesson_id,
      collaboration = 'collaborate',
      is_template = false,
      auto_snapshot = true,
    } = body;

    const { data: whiteboard, error } = await tq
      .from('whiteboards')
      .insert({
        tenant_id: tenantId,
        created_by: userProfile.id,
        title,
        description,
        elements,
        app_state,
        frames,
        visibility,
        course_id: course_id || null,
        lesson_id: lesson_id || null,
        collaboration,
        is_template,
        auto_snapshot,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating whiteboard:', error);
      return NextResponse.json({ error: 'Failed to create whiteboard' }, { status: 500 });
    }

    return NextResponse.json(whiteboard, { status: 201 });
  } catch (error) {
    console.error('Error in whiteboards POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
