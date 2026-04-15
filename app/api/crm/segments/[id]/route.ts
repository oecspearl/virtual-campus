import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/segments/[id]
 * Get segment details and its members.
 * Query params: include_members (default true), page, limit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeMembers = searchParams.get('include_members') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Fetch segment
    const { data: segment, error: segError } = await tq
      .from('crm_segments')
      .select('*, users!crm_segments_created_by_fkey(name)')
      .eq('id', id)
      .single();

    if (segError || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Check access: creator, shared, or admin
    const isAdmin = hasRole(authResult.userProfile.role, ['admin', 'super_admin']);
    if (!isAdmin && segment.created_by !== authResult.userProfile.id && !segment.is_shared) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let members: any[] = [];
    let memberTotal = 0;

    if (includeMembers) {
      const { data: memberData, count, error: memError } = await tq
        .from('crm_segment_members')
        .select('student_id, added_at, users!crm_segment_members_student_id_fkey(name, email)', { count: 'exact' })
        .eq('segment_id', id)
        .order('added_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!memError && memberData) {
        members = memberData.map((m: any) => ({
          student_id: m.student_id,
          name: m.users?.name || 'Unknown',
          email: m.users?.email || '',
          added_at: m.added_at,
        }));
        memberTotal = count || 0;
      }
    }

    return NextResponse.json({
      segment: {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        created_by: segment.created_by,
        created_by_name: segment.users?.name || null,
        criteria: segment.criteria,
        logic: segment.logic,
        member_count: segment.member_count,
        last_calculated_at: segment.last_calculated_at,
        is_dynamic: segment.is_dynamic,
        is_shared: segment.is_shared,
        metadata: segment.metadata,
        created_at: segment.created_at,
        updated_at: segment.updated_at,
      },
      members,
      member_total: memberTotal,
      page,
    });
  } catch (error: any) {
    console.error('CRM Segment Detail: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/segments/[id]
 * Update segment.
 * Body: { name?, description?, criteria?, logic?, is_shared?, metadata? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership or admin
    const { data: existing } = await tq
      .from('crm_segments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const isAdmin = hasRole(authResult.userProfile.role, ['admin', 'super_admin']);
    if (!isAdmin && existing.created_by !== authResult.userProfile.id) {
      return NextResponse.json({ error: 'Forbidden: only the creator or admin can edit' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.criteria !== undefined) {
      if (!Array.isArray(body.criteria)) {
        return NextResponse.json({ error: 'criteria must be an array' }, { status: 400 });
      }
      updates.criteria = body.criteria;
    }
    if (body.logic !== undefined) {
      if (!['AND', 'OR'].includes(body.logic)) {
        return NextResponse.json({ error: 'logic must be AND or OR' }, { status: 400 });
      }
      updates.logic = body.logic;
    }
    if (body.is_shared !== undefined) updates.is_shared = body.is_shared;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const { data, error } = await tq
      .from('crm_segments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('CRM Segment Update: Error', error);
      return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, segment: data });
  } catch (error: any) {
    console.error('CRM Segment Update: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/segments/[id]
 * Delete segment and its cached members.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership or admin
    const { data: existing } = await tq
      .from('crm_segments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const isAdmin = hasRole(authResult.userProfile.role, ['admin', 'super_admin']);
    if (!isAdmin && existing.created_by !== authResult.userProfile.id) {
      return NextResponse.json({ error: 'Forbidden: only the creator or admin can delete' }, { status: 403 });
    }

    // CASCADE will remove segment members
    const { error } = await tq
      .from('crm_segments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('CRM Segment Delete: Error', error);
      return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRM Segment Delete: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
