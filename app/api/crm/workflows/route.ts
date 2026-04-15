import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/workflows
 * List workflows. Query params: is_active, trigger_type, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');
    const triggerType = searchParams.get('trigger_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_workflows')
      .select('*, users!crm_workflows_created_by_fkey(name)', { count: 'exact' });

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }
    if (triggerType) query = query.eq('trigger_type', triggerType);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Workflows: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
    }

    const workflows = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      created_by_name: row.users?.name || null,
      is_active: row.is_active,
      trigger_type: row.trigger_type,
      trigger_config: row.trigger_config,
      conditions: row.conditions,
      actions: row.actions,
      execution_count: row.execution_count,
      last_executed_at: row.last_executed_at,
      created_at: row.created_at,
    }));

    return NextResponse.json({ workflows, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Workflows: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/workflows
 * Create a new workflow.
 * Body: { name, description?, trigger_type, trigger_config, conditions?, actions }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, trigger_type, trigger_config, conditions, actions } = body;

    if (!name || !trigger_type || !actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: 'name, trigger_type, and actions are required' }, { status: 400 });
    }

    const validTriggers = ['event', 'schedule', 'score_threshold'];
    if (!validTriggers.includes(trigger_type)) {
      return NextResponse.json({ error: `trigger_type must be one of: ${validTriggers.join(', ')}` }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('crm_workflows')
      .insert({
        name,
        description: description || null,
        created_by: authResult.userProfile.id,
        trigger_type,
        trigger_config: trigger_config || {},
        conditions: conditions || [],
        actions,
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      console.error('CRM Workflows: Create error', error);
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }

    return NextResponse.json({ success: true, workflow: data });
  } catch (error: any) {
    console.error('CRM Workflows: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
