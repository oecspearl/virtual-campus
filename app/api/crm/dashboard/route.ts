import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

/**
 * GET /api/crm/dashboard
 * Aggregated CRM dashboard data.
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

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Run all queries in parallel
    const [
      studentsRes,
      lifecycleRes,
      riskRes,
      engagementRes,
      interactionsRes,
      tasksRes,
      campaignsRes,
      workflowsRes,
      segmentsRes,
    ] = await Promise.all([
      // Total students
      tq.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),

      // Lifecycle stage counts (latest stage per student)
      tq.from('crm_student_lifecycle').select('student_id, stage').order('stage_changed_at', { ascending: false }),

      // Risk level breakdown
      tq.from('student_risk_scores').select('student_id, risk_level').order('calculated_at', { ascending: false }),

      // Engagement score stats
      tq.from('crm_engagement_scores').select('student_id, score').is('course_id', null).order('score_date', { ascending: false }),

      // Recent interactions
      tq.from('crm_interactions')
        .select('id, student_id, interaction_type, subject, created_at, users!crm_interactions_created_by_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(10),

      // Task stats
      tq.from('crm_tasks').select('id, status, priority, due_date'),

      // Active campaigns
      tq.from('crm_campaigns').select('id, name, status, stats, sent_at').order('created_at', { ascending: false }).limit(5),

      // Workflow stats
      tq.from('crm_workflows').select('id, is_active, execution_count'),

      // Segment count
      tq.from('crm_segments').select('id', { count: 'exact', head: true }),
    ]);

    // Process lifecycle stages (get latest per student)
    const stageMap = new Map<string, string>();
    for (const row of lifecycleRes.data || []) {
      if (!stageMap.has(row.student_id)) stageMap.set(row.student_id, row.stage);
    }
    const stageCounts: Record<string, number> = {};
    for (const stage of stageMap.values()) {
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }

    // Process risk levels (get latest per student)
    const riskMap = new Map<string, string>();
    for (const row of riskRes.data || []) {
      if (!riskMap.has(row.student_id)) riskMap.set(row.student_id, row.risk_level);
    }
    const riskCounts: Record<string, number> = {};
    for (const level of riskMap.values()) {
      riskCounts[level] = (riskCounts[level] || 0) + 1;
    }

    // Process engagement scores (get latest per student)
    const scoreMap = new Map<string, number>();
    for (const row of engagementRes.data || []) {
      if (!scoreMap.has(row.student_id)) scoreMap.set(row.student_id, row.score);
    }
    const scores = [...scoreMap.values()];
    const avgEngagement = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Engagement distribution
    const engagementDistribution = {
      low: scores.filter(s => s < 30).length,
      medium: scores.filter(s => s >= 30 && s < 60).length,
      high: scores.filter(s => s >= 60 && s < 80).length,
      excellent: scores.filter(s => s >= 80).length,
    };

    // Task stats
    const allTasks = tasksRes.data || [];
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const overdueTasks = allTasks.filter(t =>
      (t.status === 'pending' || t.status === 'in_progress') &&
      t.due_date && new Date(t.due_date) < new Date()
    ).length;
    const urgentTasks = allTasks.filter(t =>
      (t.status === 'pending' || t.status === 'in_progress') &&
      t.priority === 'urgent'
    ).length;

    // Workflow stats
    const allWorkflows = workflowsRes.data || [];
    const activeWorkflows = allWorkflows.filter(w => w.is_active).length;
    const totalExecutions = allWorkflows.reduce((sum, w) => sum + (w.execution_count || 0), 0);

    // Recent interactions
    const recentInteractions = (interactionsRes.data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      type: row.interaction_type,
      subject: row.subject,
      created_by_name: row.users?.name || null,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      total_students: studentsRes.count || 0,
      lifecycle: {
        stage_counts: stageCounts,
        tracked: stageMap.size,
      },
      risk: {
        level_counts: riskCounts,
        at_risk_count: (riskCounts.high || 0) + (riskCounts.critical || 0),
      },
      engagement: {
        average_score: avgEngagement,
        distribution: engagementDistribution,
        scored_students: scores.length,
      },
      tasks: {
        pending: pendingTasks,
        overdue: overdueTasks,
        urgent: urgentTasks,
        total: allTasks.length,
      },
      campaigns: {
        recent: (campaignsRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          stats: c.stats,
          sent_at: c.sent_at,
        })),
      },
      workflows: {
        active: activeWorkflows,
        total: allWorkflows.length,
        total_executions: totalExecutions,
      },
      segments: {
        total: segmentsRes.count || 0,
      },
      recent_interactions: recentInteractions,
    });
  } catch (error: any) {
    console.error('CRM Dashboard: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
