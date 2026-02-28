import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createInAppNotification } from '@/lib/notifications';

export interface CreateTaskInput {
  title: string;
  description?: string;
  student_id?: string;
  course_id?: string;
  assigned_to: string;
  created_by: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  source?: 'manual' | 'workflow' | 'system';
  source_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a CRM task and notify the assignee.
 */
export async function createTask(input: CreateTaskInput) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('crm_tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      student_id: input.student_id || null,
      course_id: input.course_id || null,
      assigned_to: input.assigned_to,
      created_by: input.created_by,
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      source: input.source || 'manual',
      source_id: input.source_id || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  // Notify the assignee (if not self-assigned)
  if (input.assigned_to !== input.created_by) {
    try {
      await createInAppNotification({
        userId: input.assigned_to,
        type: 'crm_task_assigned',
        title: 'New Task Assigned',
        message: input.title,
        linkUrl: '/crm/tasks',
        metadata: { task_id: data.id },
      });
    } catch (err) {
      console.error('Failed to notify task assignee:', err);
    }
  }

  return data;
}

/**
 * Get overdue tasks.
 */
export async function getOverdueTasks(assignedTo?: string) {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from('crm_tasks')
    .select('*, users!crm_tasks_assigned_to_fkey(name)')
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true });

  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch overdue tasks:', error);
    return [];
  }

  return data || [];
}

/**
 * Complete a task.
 */
export async function completeTask(taskId: string) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('crm_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete task: ${error.message}`);
  }

  return data;
}
