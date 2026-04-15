import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/segments
 * List segments. Query params: search, is_shared, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const isShared = searchParams.get('is_shared');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_segments')
      .select('*, users!crm_segments_created_by_fkey(name)', { count: 'exact' });

    // Non-admins can only see own + shared segments
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      query = query.or(`created_by.eq.${authResult.userProfile.id},is_shared.eq.true`);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (isShared === 'true') {
      query = query.eq('is_shared', true);
    }

    const { data, count, error } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Segments: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
    }

    const segments = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      created_by: row.created_by,
      created_by_name: row.users?.name || null,
      criteria: row.criteria,
      logic: row.logic,
      member_count: row.member_count,
      last_calculated_at: row.last_calculated_at,
      is_dynamic: row.is_dynamic,
      is_shared: row.is_shared,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ segments, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Segments: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/segments
 * Create a new segment.
 * Body: { name, description?, criteria, logic?, is_dynamic?, is_shared?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, criteria, logic, is_dynamic, is_shared, metadata } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!Array.isArray(criteria)) {
      return NextResponse.json({ error: 'criteria must be an array of filter objects' }, { status: 400 });
    }

    const validLogic = ['AND', 'OR'];
    if (logic && !validLogic.includes(logic)) {
      return NextResponse.json({ error: 'logic must be AND or OR' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('crm_segments')
      .insert({
        name,
        description: description || null,
        created_by: authResult.userProfile.id,
        criteria,
        logic: logic || 'AND',
        is_dynamic: is_dynamic !== false,
        is_shared: is_shared || false,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('CRM Segments: Create error', error);
      return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, segment: data });
  } catch (error: any) {
    console.error('CRM Segments: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
