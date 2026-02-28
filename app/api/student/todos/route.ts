import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/student/todos
 * Get all todos for the current student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const courseId = searchParams.get('course_id');
    const includeCompleted = searchParams.get('include_completed') === 'true';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('student_todos')
      .select(`
        *,
        course:courses(id, title)
      `)
      .eq('student_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else if (!includeCompleted) {
      query = query.neq('status', 'completed');
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: todos, error } = await query;

    if (error) {
      console.error('Error fetching todos:', error);
      return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
    }

    // Group todos by status for convenience
    const grouped = {
      overdue: [] as typeof todos,
      today: [] as typeof todos,
      upcoming: [] as typeof todos,
      completed: [] as typeof todos,
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    (todos || []).forEach((todo) => {
      if (todo.status === 'completed') {
        grouped.completed.push(todo);
      } else if (todo.due_date) {
        const dueDate = new Date(todo.due_date);
        if (dueDate < today) {
          grouped.overdue.push(todo);
        } else if (dueDate < tomorrow) {
          grouped.today.push(todo);
        } else {
          grouped.upcoming.push(todo);
        }
      } else {
        grouped.upcoming.push(todo);
      }
    });

    return NextResponse.json({
      todos: todos || [],
      grouped,
      stats: {
        total: todos?.length || 0,
        overdue: grouped.overdue.length,
        today: grouped.today.length,
        upcoming: grouped.upcoming.length,
        completed: grouped.completed.length,
      },
    });
  } catch (error) {
    console.error('Error in todos GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/student/todos
 * Create a new todo
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, due_date, priority, course_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: todo, error } = await tq
      .from('student_todos')
      .insert({
        student_id: user.id,
        title,
        description: description || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        course_id: course_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
    }

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('Error in todos POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
