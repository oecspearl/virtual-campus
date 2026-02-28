import { createServiceSupabaseClient } from '@/lib/supabase-server';

export type LifecycleStage =
  | 'prospect'
  | 'onboarding'
  | 'active'
  | 'at_risk'
  | 're_engagement'
  | 'completing'
  | 'alumni';

export interface LifecycleEntry {
  id: string;
  student_id: string;
  stage: LifecycleStage;
  previous_stage: string | null;
  stage_changed_at: string;
  changed_by: string | null;
  change_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CurrentStage {
  stage: LifecycleStage;
  stage_changed_at: string;
}

/**
 * Get the current lifecycle stage for a student.
 * Returns null if the student has no lifecycle entry (they will be auto-assigned on next cron run).
 */
export async function getCurrentStage(studentId: string): Promise<CurrentStage | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('crm_student_lifecycle')
    .select('stage, stage_changed_at')
    .eq('student_id', studentId)
    .order('stage_changed_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as CurrentStage;
}

/**
 * Update a student's lifecycle stage. Inserts a new history row.
 * If changedBy is null, it's treated as a system auto-transition.
 */
export async function updateStage(
  studentId: string,
  newStage: LifecycleStage,
  changedBy?: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<LifecycleEntry> {
  const supabase = createServiceSupabaseClient();

  // Get current stage to record as previous
  const current = await getCurrentStage(studentId);

  // Don't transition to the same stage
  if (current && current.stage === newStage) {
    return {
      id: '',
      student_id: studentId,
      stage: newStage,
      previous_stage: current.stage,
      stage_changed_at: current.stage_changed_at,
      changed_by: changedBy || null,
      change_reason: reason || null,
      metadata: metadata || {},
      created_at: current.stage_changed_at,
    };
  }

  const { data, error } = await supabase
    .from('crm_student_lifecycle')
    .insert({
      student_id: studentId,
      stage: newStage,
      previous_stage: current?.stage || null,
      stage_changed_at: new Date().toISOString(),
      changed_by: changedBy || null,
      change_reason: reason || null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('CRM Lifecycle: Failed to update stage', error);
    throw new Error(`Failed to update lifecycle stage: ${error.message}`);
  }

  return data as LifecycleEntry;
}

/**
 * Get full lifecycle history for a student, ordered newest first.
 */
export async function getLifecycleHistory(studentId: string): Promise<LifecycleEntry[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('crm_student_lifecycle')
    .select('*')
    .eq('student_id', studentId)
    .order('stage_changed_at', { ascending: false });

  if (error) {
    console.error('CRM Lifecycle: Failed to get history', error);
    return [];
  }

  return (data || []) as LifecycleEntry[];
}

/**
 * Auto-transition students between lifecycle stages based on rules.
 * Called by the daily cron job.
 *
 * Rules:
 * - New users with no lifecycle entry and role=student → prospect
 * - prospect → onboarding: first enrollment created
 * - onboarding → active: first lesson completed OR 7 days after enrollment
 * - active → at_risk: risk_score > 50
 * - at_risk → active: risk_score drops below 30
 * - active → completing: any enrolled course > 90% progress
 * - completing → alumni: all enrolled courses completed
 */
export async function autoTransitionStages(): Promise<{ transitioned: number; errors: string[] }> {
  const supabase = createServiceSupabaseClient();
  const results = { transitioned: 0, errors: [] as string[] };

  try {
    // 1. Assign 'prospect' to students without a lifecycle entry
    const { data: allStudents } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student');

    if (allStudents && allStudents.length > 0) {
      const { data: existingLifecycle } = await supabase
        .from('crm_student_lifecycle')
        .select('student_id')
        .in('student_id', allStudents.map(s => s.id));

      const existingIds = new Set((existingLifecycle || []).map(e => e.student_id));
      const newStudents = allStudents.filter(s => !existingIds.has(s.id));

      for (const student of newStudents) {
        try {
          // Check if they have any enrollments
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', student.id)
            .limit(1);

          const stage: LifecycleStage = enrollments && enrollments.length > 0 ? 'onboarding' : 'prospect';
          await updateStage(student.id, stage, undefined, 'System auto-assignment');
          results.transitioned++;
        } catch (err: any) {
          results.errors.push(`Init ${student.id}: ${err.message}`);
        }
      }
    }

    // 2. Get all students with their current stage (most recent entry)
    const { data: lifecycleData } = await supabase
      .from('crm_student_lifecycle')
      .select('student_id, stage, stage_changed_at')
      .order('stage_changed_at', { ascending: false });

    if (!lifecycleData) return results;

    // Deduplicate to get only the latest stage per student
    const currentStages = new Map<string, { stage: LifecycleStage; changed_at: string }>();
    for (const row of lifecycleData) {
      if (!currentStages.has(row.student_id)) {
        currentStages.set(row.student_id, { stage: row.stage as LifecycleStage, changed_at: row.stage_changed_at });
      }
    }

    // 3. Process transitions per stage
    for (const [studentId, current] of currentStages) {
      try {
        // prospect → onboarding
        if (current.stage === 'prospect') {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', studentId)
            .limit(1);

          if (enrollments && enrollments.length > 0) {
            await updateStage(studentId, 'onboarding', undefined, 'First enrollment detected');
            results.transitioned++;
            continue;
          }
        }

        // onboarding → active
        if (current.stage === 'onboarding') {
          // Check if they completed any lesson
          const { data: progress } = await supabase
            .from('progress')
            .select('id')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .limit(1);

          if (progress && progress.length > 0) {
            await updateStage(studentId, 'active', undefined, 'First lesson completed');
            results.transitioned++;
            continue;
          }

          // Check if 7 days have passed since stage change
          const daysSinceChange = (Date.now() - new Date(current.changed_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange >= 7) {
            await updateStage(studentId, 'active', undefined, '7 days since enrollment');
            results.transitioned++;
            continue;
          }
        }

        // active → at_risk (based on risk score)
        if (current.stage === 'active') {
          const { data: riskScore } = await supabase
            .from('student_risk_scores')
            .select('risk_score')
            .eq('student_id', studentId)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single();

          if (riskScore && riskScore.risk_score > 50) {
            await updateStage(studentId, 'at_risk', undefined, `Risk score: ${riskScore.risk_score}`);
            results.transitioned++;
            continue;
          }

          // active → completing (any course > 90% progress)
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('progress_percentage')
            .eq('student_id', studentId)
            .eq('status', 'active');

          if (enrollments && enrollments.length > 0) {
            const allHighProgress = enrollments.every(e => (e.progress_percentage || 0) > 90);
            if (allHighProgress) {
              await updateStage(studentId, 'completing', undefined, 'All courses above 90% progress');
              results.transitioned++;
              continue;
            }
          }
        }

        // at_risk → active (risk score drops below 30)
        if (current.stage === 'at_risk') {
          const { data: riskScore } = await supabase
            .from('student_risk_scores')
            .select('risk_score')
            .eq('student_id', studentId)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single();

          if (riskScore && riskScore.risk_score < 30) {
            await updateStage(studentId, 'active', undefined, `Risk score improved: ${riskScore.risk_score}`);
            results.transitioned++;
            continue;
          }
        }

        // completing → alumni (all courses completed)
        if (current.stage === 'completing') {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('status')
            .eq('student_id', studentId);

          if (enrollments && enrollments.length > 0) {
            const allCompleted = enrollments.every(e => e.status === 'completed');
            if (allCompleted) {
              await updateStage(studentId, 'alumni', undefined, 'All courses completed');
              results.transitioned++;
              continue;
            }
          }
        }
      } catch (err: any) {
        results.errors.push(`Transition ${studentId}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error('CRM Lifecycle: Auto-transition error', err);
    results.errors.push(`Global: ${err.message}`);
  }

  return results;
}
