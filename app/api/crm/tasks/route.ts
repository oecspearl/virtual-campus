import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createTask } from '@/lib/crm/task-service';

/**
 * GET /api/crm/tasks
 * List tasks. Query params: assigned_to, student_id, status, priority, page, limit, mine
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
    const assignedTo = searchParams.get('assigned_to');
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const mine = searchParams.get('mine');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assigned_to_fkey(name),
        creator:users!crm_tasks_created_by_fkey(name),
        student:users!crm_tasks_student_id_fkey(name, email)
      `, { count: 'exact' });

    if (mine === 'true') {
      query = query.eq('assigned_to', authResult.userProfile.id);
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { data, count, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('CRM Tasks: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    const tasks = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      student_id: row.student_id,
      student_name: row.student?.name || null,
      student_email: row.student?.email || null,
      course_id: row.course_id,
      assigned_to: row.assigned_to,
      assigned_to_name: row.assignee?.name || null,
      created_by: row.created_by,
      created_by_name: row.creator?.name || null,
      priority: row.priority,
      status: row.status,
      due_date: row.due_date,
      completed_at: row.completed_at,
      source: row.source,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ tasks, total: count || 0, page });
  } catch (error: any) {
    console.error('CRM Tasks: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/tasks
 * Create a new task.
 * Body: { title, description?, student_id?, course_id?, assigned_to, priority?, due_date? }
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
    const { title, description, student_id, course_id, assigned_to, priority, due_date } = body;

    if (!title || !assigned_to) {
      return NextResponse.json({ error: 'title and assigned_to are required' }, { status: 400 });
    }

    const task = await createTask({
      title,
      description,
      student_id,
      course_id,
      assigned_to,
      created_by: authResult.userProfile.id,
      priority,
      due_date,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('CRM Tasks: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
