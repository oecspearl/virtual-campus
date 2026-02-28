import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/courses/[id]/categories
 * Get categories assigned to a course
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: assignments, error } = await tq
      .from('course_category_assignments')
      .select(`
        id,
        is_primary,
        category:category_id (
          id,
          name,
          slug,
          icon,
          color,
          parent_id
        )
      `)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching course categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    const categories = assignments?.map(a => ({
      ...a.category,
      is_primary: a.is_primary
    })) || [];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Course categories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]/categories
 * Update categories assigned to a course
 * Body: { category_ids: string[], primary_category_id?: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
    }

    const body = await request.json();
    const { category_ids, primary_category_id } = body;

    if (!Array.isArray(category_ids)) {
      return NextResponse.json({ error: 'category_ids must be an array' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Verify course exists
    const { data: course } = await tq
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Delete existing assignments
    await tq
      .from('course_category_assignments')
      .delete()
      .eq('course_id', courseId);

    // Insert new assignments
    if (category_ids.length > 0) {
      const assignments = category_ids.map(categoryId => ({
        course_id: courseId,
        category_id: categoryId,
        is_primary: categoryId === primary_category_id
      }));

      const { error: insertError } = await tq
        .from('course_category_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting category assignments:', insertError);
        return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
      }
    }

    // Fetch updated assignments
    const { data: updatedAssignments } = await tq
      .from('course_category_assignments')
      .select(`
        id,
        is_primary,
        category:category_id (
          id,
          name,
          slug,
          icon,
          color
        )
      `)
      .eq('course_id', courseId);

    const categories = updatedAssignments?.map(a => ({
      ...a.category,
      is_primary: a.is_primary
    })) || [];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Course categories PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/courses/[id]/categories
 * Add a single category to a course
 * Body: { category_id: string, is_primary?: boolean }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
    }

    const body = await request.json();
    const { category_id, is_primary } = body;

    if (!category_id) {
      return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // If setting as primary, unset other primaries first
    if (is_primary) {
      await tq
        .from('course_category_assignments')
        .update({ is_primary: false })
        .eq('course_id', courseId);
    }

    const { data: assignment, error } = await tq
      .from('course_category_assignments')
      .upsert({
        course_id: courseId,
        category_id,
        is_primary: is_primary || false
      }, {
        onConflict: 'course_id,category_id'
      })
      .select(`
        id,
        is_primary,
        category:category_id (
          id,
          name,
          slug,
          icon,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error adding category:', error);
      return NextResponse.json({ error: 'Failed to add category' }, { status: 500 });
    }

    return NextResponse.json({
      category: {
        ...assignment.category,
        is_primary: assignment.is_primary
      }
    });
  } catch (error) {
    console.error('Course categories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
