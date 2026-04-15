import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/tasks/[id]
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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data, error } = await tq
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assigned_to_fkey(name, email),
        creator:users!crm_tasks_created_by_fkey(name),
        student:users!crm_tasks_student_id_fkey(name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: data });
  } catch (error: any) {
    console.error('CRM Task Detail: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/tasks/[id]
 * Update task. Body: { title?, description?, status?, priority?, due_date?, assigned_to? }
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

    // Check ownership (unless admin)
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      const { data: existing } = await tq
        .from('crm_tasks')
        .select('assigned_to, created_by')
        .eq('id', id)
        .single();

      if (existing && existing.assigned_to !== authResult.userProfile.id && existing.created_by !== authResult.userProfile.id) {
        return NextResponse.json({ error: 'You can only update tasks assigned to or created by you' }, { status: 403 });
      }
    }

    const body = await request.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await tq
      .from('crm_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('CRM Task Update: Error', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });
  } catch (error: any) {
    console.error('CRM Task Update: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/tasks/[id]
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

    // Check ownership (unless admin)
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      const { data: existing } = await tq
        .from('crm_tasks')
        .select('assigned_to, created_by')
        .eq('id', id)
        .single();

      if (existing && existing.assigned_to !== authResult.userProfile.id && existing.created_by !== authResult.userProfile.id) {
        return NextResponse.json({ error: 'You can only delete tasks assigned to or created by you' }, { status: 403 });
      }
    }

    const { error } = await tq
      .from('crm_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('CRM Task Delete: Error', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRM Task Delete: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
