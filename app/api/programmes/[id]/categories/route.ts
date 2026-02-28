import { NextRequest, NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programmes/[id]/categories
 * Get categories assigned to a programme
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: programmeId } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: assignments, error } = await tq
      .from('programme_category_assignments')
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
      .eq('programme_id', programmeId);

    if (error) {
      console.error('Error fetching programme categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    const categories = assignments?.map(a => ({
      ...a.category,
      is_primary: a.is_primary
    })) || [];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Programme categories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/programmes/[id]/categories
 * Update categories assigned to a programme
 * Body: { category_ids: string[], primary_category_id?: string }
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
    const { category_ids, primary_category_id } = body;

    if (!Array.isArray(category_ids)) {
      return NextResponse.json({ error: 'category_ids must be an array' }, { status: 400 });
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

    // Delete existing assignments
    await tq
      .from('programme_category_assignments')
      .delete()
      .eq('programme_id', programmeId);

    // Insert new assignments
    if (category_ids.length > 0) {
      const assignments = category_ids.map(categoryId => ({
        programme_id: programmeId,
        category_id: categoryId,
        is_primary: categoryId === primary_category_id
      }));

      const { error: insertError } = await tq
        .from('programme_category_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting category assignments:', insertError);
        return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
      }
    }

    // Fetch updated assignments
    const { data: updatedAssignments } = await tq
      .from('programme_category_assignments')
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
      .eq('programme_id', programmeId);

    const categories = updatedAssignments?.map(a => ({
      ...a.category,
      is_primary: a.is_primary
    })) || [];

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Programme categories PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
