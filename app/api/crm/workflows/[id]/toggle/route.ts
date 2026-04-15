import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * POST /api/crm/workflows/[id]/toggle
 * Activate or deactivate a workflow.
 */
export async function POST(
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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get current state
    const { data: workflow } = await tq
      .from('crm_workflows')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Toggle
    const { data, error } = await tq
      .from('crm_workflows')
      .update({
        is_active: !workflow.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('CRM Workflow Toggle: Error', error);
      return NextResponse.json({ error: 'Failed to toggle workflow' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      is_active: data.is_active,
    });
  } catch (error: any) {
    console.error('CRM Workflow Toggle: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
