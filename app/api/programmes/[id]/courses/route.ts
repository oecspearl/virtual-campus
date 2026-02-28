import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programmes/[id]/courses
 * Get courses in a programme
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: courses, error } = await tq
      .from('programme_courses')
      .select(`
        id,
        order,
        weight,
        is_required,
        course:course_id(
          id,
          title,
          description,
          thumbnail,
          difficulty,
          published
        )
      `)
      .eq('programme_id', programmeId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching programme courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    const transformedCourses = courses?.map(pc => ({
      ...pc.course,
      order: pc.order,
      weight: pc.weight,
      is_required: pc.is_required,
      assignment_id: pc.id
    })) || [];

    return NextResponse.json({ courses: transformedCourses });
  } catch (error) {
    console.error('Programme courses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/programmes/[id]/courses
 * Update all courses in a programme (replace)
 * Body: { courses: [{ course_id, order, weight, is_required }] }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { courses } = body;

    if (!Array.isArray(courses)) {
      return NextResponse.json({ error: 'courses must be an array' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify programme exists
    const { data: programme } = await tq
      .from('programmes')
      .select('id')
      .eq('id', programmeId)
      .single();

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Delete existing course assignments
    await tq
      .from('programme_courses')
      .delete()
      .eq('programme_id', programmeId);

    // Insert new course assignments
    if (courses.length > 0) {
      const assignments = courses.map((c: any, index: number) => ({
        programme_id: programmeId,
        course_id: c.course_id,
        order: c.order ?? index,
        weight: c.weight ?? 1.00,
        is_required: c.is_required ?? true
      }));

      const { error: insertError } = await tq
        .from('programme_courses')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting programme courses:', insertError);
        return NextResponse.json({ error: 'Failed to update courses' }, { status: 500 });
      }
    }

    // Fetch updated courses
    const { data: updatedCourses } = await tq
      .from('programme_courses')
      .select(`
        id,
        order,
        weight,
        is_required,
        course:course_id(id, title, thumbnail)
      `)
      .eq('programme_id', programmeId)
      .order('order', { ascending: true });

    return NextResponse.json({
      courses: updatedCourses?.map(pc => ({
        ...pc.course,
        order: pc.order,
        weight: pc.weight,
        is_required: pc.is_required
      })) || []
    });
  } catch (error) {
    console.error('Programme courses PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/programmes/[id]/courses
 * Add a single course to a programme
 * Body: { course_id, order?, weight?, is_required? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { course_id, order, weight, is_required } = body;

    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get max order if not specified
    let courseOrder = order;
    if (courseOrder === undefined) {
      const { data: maxOrder } = await tq
        .from('programme_courses')
        .select('order')
        .eq('programme_id', programmeId)
        .order('order', { ascending: false })
        .limit(1)
        .single();

      courseOrder = (maxOrder?.order ?? -1) + 1;
    }

    const { data: assignment, error } = await tq
      .from('programme_courses')
      .upsert({
        programme_id: programmeId,
        course_id,
        order: courseOrder,
        weight: weight ?? 1.00,
        is_required: is_required ?? true
      }, {
        onConflict: 'programme_id,course_id'
      })
      .select(`
        id,
        order,
        weight,
        is_required,
        course:course_id(id, title, thumbnail)
      `)
      .single();

    if (error) {
      console.error('Error adding course to programme:', error);
      return NextResponse.json({ error: 'Failed to add course' }, { status: 500 });
    }

    return NextResponse.json({
      course: {
        ...assignment.course,
        order: assignment.order,
        weight: assignment.weight,
        is_required: assignment.is_required
      }
    });
  } catch (error) {
    console.error('Programme courses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/programmes/[id]/courses
 * Remove a course from a programme
 * Query: ?course_id=xxx
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('programme_courses')
      .delete()
      .eq('programme_id', programmeId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error removing course from programme:', error);
      return NextResponse.json({ error: 'Failed to remove course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Programme courses DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
