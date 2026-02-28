import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/student/todos/[id]
 * Get a single todo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: todo, error } = await tq
      .from('student_todos')
      .select(`
        *,
        course:courses(id, title)
      `)
      .eq('id', id)
      .eq('student_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
      }
      console.error('Error fetching todo:', error);
      return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 });
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error in todo GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/student/todos/[id]
 * Update a todo
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, due_date, priority, status } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    const { data: todo, error } = await tq
      .from('student_todos')
      .update(updateData)
      .eq('id', id)
      .eq('student_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error);
      return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error in todo PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/student/todos/[id]
 * Delete a todo
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { error } = await tq
      .from('student_todos')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id);

    if (error) {
      console.error('Error deleting todo:', error);
      return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in todo DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
