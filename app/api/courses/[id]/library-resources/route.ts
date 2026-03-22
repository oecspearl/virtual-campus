import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

// GET - List library resources attached to a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { id: courseId } = await params;

    let tenantId: string;
    try {
      tenantId = getTenantIdFromRequest(request);
    } catch {
      // Fallback to default tenant if header missing
      tenantId = '00000000-0000-0000-0000-000000000001';
    }

    const tq = createTenantQuery(tenantId);
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    // Try with joins first
    let query = tq
      .from('course_library_resources')
      .select('*, library_resources(*, library_resource_categories(id, name, icon, color))')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    let { data, error } = await query;

    // Fallback: if the join fails (e.g. PostgREST schema cache stale), try simple select
    if (error) {
      console.warn('Library resources join query failed:', error.message, '- trying simple select');
      let fallbackQuery = tq
        .from('course_library_resources')
        .select('*')
        .eq('course_id', courseId)
        .order('order', { ascending: true });

      if (lessonId) {
        fallbackQuery = fallbackQuery.eq('lesson_id', lessonId);
      }

      const result = await fallbackQuery;
      if (result.error) {
        // Table likely doesn't exist yet - return empty
        console.warn('Library resources table query failed:', result.error.message);
        return NextResponse.json({ attachments: [] });
      }
      data = result.data;
    }

    return NextResponse.json({ attachments: data || [] });
  } catch (error: any) {
    console.error('Error fetching course library resources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch course library resources' },
      { status: 500 }
    );
  }
}

// POST - Attach library resources to a course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { resource_ids, lesson_id } = body;

    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return NextResponse.json({ error: 'resource_ids array is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get current max order
    const { data: existing } = await tq
      .from('course_library_resources')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1);

    let nextOrder = (existing && existing.length > 0) ? (existing[0].order + 1) : 0;

    const insertData = resource_ids.map((resourceId: string) => ({
      course_id: courseId,
      lesson_id: lesson_id || null,
      resource_id: resourceId,
      order: nextOrder++,
      added_by: authResult.user.id,
    }));

    const { data, error } = await tq
      .from('course_library_resources')
      .upsert(insertData, { onConflict: 'course_id,lesson_id,resource_id', ignoreDuplicates: true })
      .select('*, library_resources(*, library_resource_categories(id, name, icon, color))');

    if (error) throw error;

    return NextResponse.json({ attachments: data || [] }, { status: 201 });
  } catch (error: any) {
    console.error('Error attaching library resources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to attach library resources' },
      { status: 500 }
    );
  }
}

// DELETE - Detach a library resource from a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    if (!['admin', 'super_admin', 'tenant_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');
    const attachmentId = searchParams.get('attachment_id');

    if (!resourceId && !attachmentId) {
      return NextResponse.json({ error: 'resource_id or attachment_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('course_library_resources')
      .delete()
      .eq('course_id', courseId);

    if (attachmentId) {
      query = query.eq('id', attachmentId);
    } else if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error detaching library resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detach library resource' },
      { status: 500 }
    );
  }
}
