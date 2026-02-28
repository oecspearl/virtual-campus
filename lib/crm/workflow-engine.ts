import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { sendEmail, replaceTemplateVariables } from '@/lib/email-service';
import { createInAppNotification } from '@/lib/notifications';
import { createTask } from '@/lib/crm/task-service';
import { updateStage, LifecycleStage } from '@/lib/crm/lifecycle-service';
import { evaluateCriteria, FilterCriteria } from '@/lib/crm/segmentation-engine';

export type EventType =
  | 'enrollment_created'
  | 'quiz_failed'
  | 'inactivity_detected'
  | 'risk_score_changed'
  | 'assignment_missed'
  | 'stage_changed';

export interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_stage' | 'create_notification';
  config: Record<string, any>;
}

/**
 * Process event-based workflow triggers.
 * Called from API routes when events occur (enrollment, quiz fail, etc).
 */
export async function processEventTriggers(
  eventType: EventType,
  studentId: string,
  eventData: Record<string, any> = {}
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  // Find active workflows with matching event trigger
  const { data: workflows } = await supabase
    .from('crm_workflows')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', 'event')
    .contains('trigger_config', { event_type: eventType });

  if (!workflows || workflows.length === 0) return;

  for (const workflow of workflows) {
    try {
      // Check conditions (if any)
      const conditions = (workflow.conditions || []) as FilterCriteria[];
      if (conditions.length > 0) {
        const matchingIds = await evaluateCriteria(conditions, 'AND');
        if (!matchingIds.includes(studentId)) continue;
      }

      // Execute actions
      const actions = (workflow.actions || []) as WorkflowAction[];
      const results = await executeActions(actions, studentId, eventData);

      // Log execution
      await supabase.from('crm_workflow_executions').insert({
        workflow_id: workflow.id,
        student_id: studentId,
        trigger_data: { event_type: eventType, ...eventData },
        actions_executed: results,
        status: results.every((r: any) => r.success) ? 'success' : results.some((r: any) => r.success) ? 'partial' : 'failed',
      });

      // Update execution count
      await supabase
        .from('crm_workflows')
        .update({
          execution_count: (workflow.execution_count || 0) + 1,
          last_executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflow.id);
    } catch (error: any) {
      console.error(`Workflow ${workflow.id} execution error:`, error);
      await supabase.from('crm_workflow_executions').insert({
        workflow_id: workflow.id,
        student_id: studentId,
        trigger_data: { event_type: eventType, ...eventData },
        actions_executed: [],
        status: 'failed',
        error_message: error.message,
      });
    }
  }
}

/**
 * Process score-threshold workflows.
 * Called by cron job to check if any thresholds have been crossed.
 */
export async function processScoreThresholdWorkflows(): Promise<{ processed: number; errors: number }> {
  const supabase = createServiceSupabaseClient();

  const { data: workflows } = await supabase
    .from('crm_workflows')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', 'score_threshold');

  let processed = 0;
  let errors = 0;

  for (const workflow of workflows || []) {
    try {
      const config = workflow.trigger_config || {};
      const metric = config.metric; // 'engagement_score' or 'risk_score'
      const operator = config.operator; // 'gt', 'lt', 'gte', 'lte'
      const threshold = Number(config.value);

      if (!metric || !operator || isNaN(threshold)) continue;

      // Build criteria to find matching students
      const criteria: FilterCriteria[] = [
        { field: metric === 'risk_score' ? 'risk_level' : 'engagement_score', operator, value: threshold },
      ];

      // Add workflow conditions
      const conditions = (workflow.conditions || []) as FilterCriteria[];
      criteria.push(...conditions);

      const matchingIds = await evaluateCriteria(criteria, 'AND');

      for (const studentId of matchingIds) {
        try {
          const actions = (workflow.actions || []) as WorkflowAction[];
          const results = await executeActions(actions, studentId, { metric, threshold });

          await supabase.from('crm_workflow_executions').insert({
            workflow_id: workflow.id,
            student_id: studentId,
            trigger_data: { metric, operator, threshold },
            actions_executed: results,
            status: results.every((r: any) => r.success) ? 'success' : 'partial',
          });

          processed++;
        } catch (err) {
          errors++;
        }
      }

      // Update execution count
      await supabase
        .from('crm_workflows')
        .update({
          execution_count: (workflow.execution_count || 0) + matchingIds.length,
          last_executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflow.id);
    } catch (error) {
      console.error(`Threshold workflow ${workflow.id} error:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Execute an array of workflow actions for a given student.
 */
async function executeActions(
  actions: WorkflowAction[],
  studentId: string,
  context: Record<string, any>
): Promise<Array<{ type: string; success: boolean; error?: string }>> {
  const supabase = createServiceSupabaseClient();
  const results: Array<{ type: string; success: boolean; error?: string }> = [];

  // Get student info for personalization
  const { data: student } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', studentId)
    .single();

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_email': {
          if (!student?.email) {
            results.push({ type: 'send_email', success: false, error: 'No email' });
            break;
          }

          const variables: Record<string, string> = {
            student_name: student.name || 'Student',
            student_email: student.email,
            ...Object.fromEntries(
              Object.entries(context).map(([k, v]) => [k, String(v)])
            ),
          };

          const subject = replaceTemplateVariables(action.config.subject || 'Notification', variables);
          const body = replaceTemplateVariables(action.config.body_html || '', variables);

          const result = await sendEmail({
            to: student.email,
            subject,
            html: body,
            tags: [{ name: 'source', value: 'workflow' }],
          });

          results.push({ type: 'send_email', success: result.success, error: result.error });
          break;
        }

        case 'create_task': {
          await createTask({
            title: replaceTemplateVariables(action.config.title || 'Follow up', {
              student_name: student?.name || 'Student',
            }),
            description: action.config.description || null,
            student_id: studentId,
            assigned_to: action.config.assigned_to || context.instructor_id || studentId,
            created_by: action.config.assigned_to || context.instructor_id || studentId,
            priority: action.config.priority || 'medium',
            due_date: action.config.due_in_days
              ? new Date(Date.now() + Number(action.config.due_in_days) * 86400000).toISOString()
              : undefined,
            source: 'workflow',
          });
          results.push({ type: 'create_task', success: true });
          break;
        }

        case 'update_stage': {
          const newStage = action.config.stage as LifecycleStage;
          if (newStage) {
            await updateStage(studentId, newStage, undefined, `Automated: workflow action`);
            results.push({ type: 'update_stage', success: true });
          } else {
            results.push({ type: 'update_stage', success: false, error: 'No stage specified' });
          }
          break;
        }

        case 'create_notification': {
          await createInAppNotification({
            userId: action.config.notify_user_id || studentId,
            type: 'crm_workflow',
            title: action.config.title || 'CRM Notification',
            message: replaceTemplateVariables(action.config.message || '', {
              student_name: student?.name || 'Student',
            }),
            linkUrl: action.config.link_url || '/crm',
          });
          results.push({ type: 'create_notification', success: true });
          break;
        }

        default:
          results.push({ type: action.type, success: false, error: 'Unknown action type' });
      }
    } catch (error: any) {
      results.push({ type: action.type, success: false, error: error.message });
    }
  }

  return results;
}
