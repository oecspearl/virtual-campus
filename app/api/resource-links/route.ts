import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { sanitizeHtml } from '@/lib/sanitize-server';
import { requireCourseAccess } from '@/lib/enrollment-check';

// GET - Fetch resource links for a course or lesson
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!courseId && !lessonId) {
      return NextResponse.json({ error: 'courseId or lessonId is required' }, { status: 400 });
    }

    // Resolve the parent course id so requireCourseAccess can decide:
    // - lessonId → look up the lesson's course_id
    // - courseId → use it directly
    let parentCourseId: string | null = courseId;
    if (!parentCourseId && lessonId) {
      const { data: lesson } = await tq
        .from('lessons')
        .select('course_id')
        .eq('id', lessonId)
        .single();
      parentCourseId = lesson?.course_id ?? null;
    }

    if (!parentCourseId) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Authentication is optional here — public courses serve guests too.
    const authResult = await authenticateUser(request);
    const user = authResult.success
      ? { id: authResult.user.id, role: authResult.userProfile!.role }
      : null;

    const access = await requireCourseAccess(user, parentCourseId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: access.status });
    }

    let query = tq
      .from('resource_links')
      .select('*')
      .order('order', { ascending: true });

    if (courseId && !lessonId) {
      query = query.eq('course_id', courseId).is('lesson_id', null);
    } else if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ links: data || [] });
  } catch (error: any) {
    console.error('Error fetching resource links:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resource links' },
      { status: 500 }
    );
  }
}

// POST - Create a new resource link
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const body = await request.json();
    const { courseId, lessonId, title, url, description, link_type, body_html } = body;

    const resolvedType = link_type || 'external';
    const isText = resolvedType === 'text';

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (isText && !body_html) {
      return NextResponse.json(
        { error: 'body_html is required for text resources' },
        { status: 400 }
      );
    }
    if (!isText && !url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!courseId && !lessonId) {
      return NextResponse.json(
        { error: 'courseId or lessonId is required' },
        { status: 400 }
      );
    }

    // Verify user has permission
    if (!['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'].includes(authResult.userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Create the resource link. The DB CHECK constraint
    // (resource_links_shape_check) enforces that text rows have body_html +
    // null url, and link rows have url + null body_html — keep that contract
    // in sync here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      title,
      description: description || null,
      link_type: resolvedType,
      created_by: authResult.user.id,
      order: 0,
    };
    if (isText) {
      insertData.body_html = sanitizeHtml(body_html);
      insertData.url = null;
    } else {
      insertData.url = url;
      insertData.body_html = null;
    }

    if (courseId) insertData.course_id = courseId;
    if (lessonId) insertData.lesson_id = lessonId;

    const { data: link, error } = await tq
      .from('resource_links')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ link }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating resource link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create resource link' },
      { status: 500 }
    );
  }
}
