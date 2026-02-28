import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like';
  value: any;
}

/**
 * Evaluate a segment's criteria and return matching student IDs.
 */
export async function evaluateSegment(segmentId: string): Promise<string[]> {
  const supabase = createServiceSupabaseClient();

  const { data: segment } = await supabase
    .from('crm_segments')
    .select('criteria, logic')
    .eq('id', segmentId)
    .single();

  if (!segment) return [];

  return evaluateCriteria(segment.criteria as FilterCriteria[], segment.logic || 'AND');
}

/**
 * Evaluate filter criteria and return matching student IDs.
 */
export async function evaluateCriteria(
  criteria: FilterCriteria[],
  logic: 'AND' | 'OR' = 'AND'
): Promise<string[]> {
  const supabase = createServiceSupabaseClient();

  if (!criteria || criteria.length === 0) {
    // No criteria: return all students
    const { data } = await supabase.from('users').select('id').eq('role', 'student');
    return (data || []).map(d => d.id);
  }

  // Evaluate each criterion independently, then combine with AND/OR
  const criteriaResults: Set<string>[] = [];

  for (const criterion of criteria) {
    const matchingIds = await evaluateSingleCriterion(criterion);
    criteriaResults.push(new Set(matchingIds));
  }

  if (criteriaResults.length === 0) return [];

  if (logic === 'AND') {
    // Intersection of all sets
    let result = criteriaResults[0];
    for (let i = 1; i < criteriaResults.length; i++) {
      result = new Set([...result].filter(id => criteriaResults[i].has(id)));
    }
    return [...result];
  } else {
    // Union of all sets
    const result = new Set<string>();
    for (const set of criteriaResults) {
      for (const id of set) result.add(id);
    }
    return [...result];
  }
}

async function evaluateSingleCriterion(criterion: FilterCriteria): Promise<string[]> {
  const supabase = createServiceSupabaseClient();
  const { field, operator, value } = criterion;

  switch (field) {
    case 'lifecycle_stage': {
      // Get students at a particular lifecycle stage (latest entry)
      const { data } = await supabase
        .from('crm_student_lifecycle')
        .select('student_id, stage')
        .order('stage_changed_at', { ascending: false });

      const latestStage = new Map<string, string>();
      for (const row of (data || [])) {
        if (!latestStage.has(row.student_id)) {
          latestStage.set(row.student_id, row.stage);
        }
      }

      return [...latestStage.entries()]
        .filter(([, stage]) => applyOperator(stage, operator, value))
        .map(([id]) => id);
    }

    case 'risk_level': {
      const { data } = await supabase
        .from('student_risk_scores')
        .select('student_id, risk_level')
        .order('calculated_at', { ascending: false });

      const latest = new Map<string, string>();
      for (const row of (data || [])) {
        if (!latest.has(row.student_id)) latest.set(row.student_id, row.risk_level);
      }

      return [...latest.entries()]
        .filter(([, level]) => applyOperator(level, operator, value))
        .map(([id]) => id);
    }

    case 'engagement_score': {
      const { data } = await supabase
        .from('crm_engagement_scores')
        .select('student_id, score')
        .is('course_id', null)
        .order('score_date', { ascending: false });

      const latest = new Map<string, number>();
      for (const row of (data || [])) {
        if (!latest.has(row.student_id)) latest.set(row.student_id, row.score);
      }

      return [...latest.entries()]
        .filter(([, score]) => applyOperator(score, operator, Number(value)))
        .map(([id]) => id);
    }

    case 'enrollment_status': {
      let query = supabase.from('enrollments').select('student_id');
      query = applySupabaseOperator(query, 'status', operator, value);
      const { data } = await query;
      return [...new Set((data || []).map(d => d.student_id))];
    }

    case 'course_id': {
      const { data } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', value);
      return [...new Set((data || []).map(d => d.student_id))];
    }

    case 'last_active_days_ago': {
      const threshold = new Date(Date.now() - Number(value) * 24 * 60 * 60 * 1000).toISOString();
      const { data: allStudents } = await supabase.from('users').select('id').eq('role', 'student');
      const { data: activeStudents } = await supabase
        .from('student_activity_log')
        .select('student_id')
        .gte('created_at', threshold);

      const activeSet = new Set((activeStudents || []).map(a => a.student_id));

      if (operator === 'gt' || operator === 'gte') {
        // Students who have NOT been active in the last N days
        return (allStudents || []).filter(s => !activeSet.has(s.id)).map(s => s.id);
      } else {
        // Students who HAVE been active in the last N days
        return [...activeSet];
      }
    }

    case 'gender': {
      let query = supabase.from('users').select('id').eq('role', 'student');
      query = applySupabaseOperator(query, 'gender', operator, value);
      const { data } = await query;
      return (data || []).map(d => d.id);
    }

    default:
      return [];
  }
}

function applyOperator(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case 'eq': return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
    case 'neq': return actual !== expected;
    case 'gt': return actual > expected;
    case 'lt': return actual < expected;
    case 'gte': return actual >= expected;
    case 'lte': return actual <= expected;
    case 'in': return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
    case 'like': return typeof actual === 'string' && actual.toLowerCase().includes(String(expected).toLowerCase());
    default: return false;
  }
}

function applySupabaseOperator(query: any, column: string, operator: string, value: any): any {
  switch (operator) {
    case 'eq': return query.eq(column, value);
    case 'neq': return query.neq(column, value);
    case 'gt': return query.gt(column, value);
    case 'lt': return query.lt(column, value);
    case 'gte': return query.gte(column, value);
    case 'lte': return query.lte(column, value);
    case 'in': return query.in(column, Array.isArray(value) ? value : [value]);
    default: return query.eq(column, value);
  }
}

/**
 * Refresh cached segment membership.
 */
export async function refreshSegmentMembers(
  segmentId: string
): Promise<{ member_count: number; added: number; removed: number }> {
  const supabase = createServiceSupabaseClient();
  const matchingIds = await evaluateSegment(segmentId);

  // Get current members
  const { data: currentMembers } = await supabase
    .from('crm_segment_members')
    .select('student_id')
    .eq('segment_id', segmentId);

  const currentIds = new Set((currentMembers || []).map(m => m.student_id));
  const newIds = new Set(matchingIds);

  // Add new members
  const toAdd = matchingIds.filter(id => !currentIds.has(id));
  if (toAdd.length > 0) {
    await supabase
      .from('crm_segment_members')
      .insert(toAdd.map(student_id => ({ segment_id: segmentId, student_id })));
  }

  // Remove old members
  const toRemove = [...currentIds].filter(id => !newIds.has(id));
  if (toRemove.length > 0) {
    await supabase
      .from('crm_segment_members')
      .delete()
      .eq('segment_id', segmentId)
      .in('student_id', toRemove);
  }

  // Update count
  await supabase
    .from('crm_segments')
    .update({
      member_count: matchingIds.length,
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', segmentId);

  return {
    member_count: matchingIds.length,
    added: toAdd.length,
    removed: toRemove.length,
  };
}
