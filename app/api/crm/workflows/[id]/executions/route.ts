import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/workflows/[id]/executions
 * Get execution log for a workflow.
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

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, count, error } = await tq
      .from('crm_workflow_executions')
      .select('*, users!crm_workflow_executions_student_id_fkey(name, email)', { count: 'exact' })
      .eq('workflow_id', id)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Workflow Executions: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }

    const executions = (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      student_name: row.users?.name || null,
      student_email: row.users?.email || null,
      trigger_data: row.trigger_data,
      actions_executed: row.actions_executed,
      status: row.status,
      error_message: row.error_message,
      executed_at: row.executed_at,
    }));

    return NextResponse.json({ executions, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Workflow Executions: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
