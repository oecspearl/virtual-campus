import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programmes/[id]
 * Get a single programme with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is staff
    let isStaff = false;
    let studentId: string | null = null;
    const authResult = await authenticateUser(request);
    if (authResult.success) {
      isStaff = ['admin', 'super_admin', 'instructor', 'curriculum_designer'].includes(authResult.userProfile.role);
      studentId = authResult.userProfile.id;
    }

    const { data: programme, error } = await tq
      .from('programmes')
      .select(`
        *,
        created_by_user:created_by(name, email),
        programme_courses(
          id,
          course_id,
          order,
          weight,
          is_required,
          course:course_id(id, title, description, thumbnail, difficulty, published)
        ),
        programme_category_assignments(
          is_primary,
          category:category_id(id, name, slug, icon, color)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Check visibility
    if (!programme.published && !isStaff) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Get enrollment count
    const { count: enrollmentCount } = await tq
      .from('programme_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('programme_id', id);

    // Check if current user is enrolled
    let enrollment = null;
    if (studentId) {
      const { data: enrollmentData } = await tq
        .from('programme_enrollments')
        .select('*')
        .eq('programme_id', id)
        .eq('student_id', studentId)
        .single();
      enrollment = enrollmentData;
    }

    // Transform for response
    const response = {
      ...programme,
      categories: programme.programme_category_assignments?.map((pca: any) => ({
        ...pca.category,
        is_primary: pca.is_primary
      })).filter(Boolean) || [],
      courses: programme.programme_courses
        ?.sort((a: any, b: any) => a.order - b.order)
        .map((pc: any) => ({
          ...pc.course,
          order: pc.order,
          weight: pc.weight,
          is_required: pc.is_required
        })) || [],
      enrollment_count: enrollmentCount || 0,
      is_enrolled: !!enrollment,
      enrollment: enrollment
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Programme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/programmes/[id]
 * Update a programme
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin', 'curriculum_designer'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, thumbnail, difficulty, estimated_duration, passing_score, published } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if programme exists
    const { data: existing } = await tq
      .from('programmes')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) {
      updateData.title = title.trim();
      // Update slug if title changed
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check for duplicate slug
      const { data: duplicateSlug } = await tq
        .from('programmes')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .single();

      if (duplicateSlug) {
        return NextResponse.json({ error: 'A programme with this title already exists' }, { status: 409 });
      }
    }

    if (description !== undefined) updateData.description = description?.trim() || null;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (passing_score !== undefined) updateData.passing_score = passing_score;
    if (published !== undefined) updateData.published = published;

    const { data: programme, error } = await tq
      .from('programmes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating programme:', error);
      return NextResponse.json({ error: 'Failed to update programme' }, { status: 500 });
    }

    return NextResponse.json({ programme });
  } catch (error) {
    console.error('Programme PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/programmes/[id]
 * Delete a programme
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check for active enrollments
    const { count: enrollmentCount } = await tq
      .from('programme_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('programme_id', id)
      .eq('status', 'active');

    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json({
        error: `Cannot delete programme with ${enrollmentCount} active enrollments`
      }, { status: 400 });
    }

    const { error } = await tq
      .from('programmes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting programme:', error);
      return NextResponse.json({ error: 'Failed to delete programme' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Programme DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
