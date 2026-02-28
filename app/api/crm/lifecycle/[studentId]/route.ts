import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { getLifecycleHistory, getCurrentStage } from '@/lib/crm/lifecycle-service';

/**
 * GET /api/crm/lifecycle/[studentId]
 * Get a single student's lifecycle history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    // Students can view their own lifecycle; staff can view any
    const isSelf = authResult.userProfile.id === studentId;
    const isStaff = hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin']);

    if (!isSelf && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [currentStage, history] = await Promise.all([
      getCurrentStage(studentId),
      getLifecycleHistory(studentId),
    ]);

    return NextResponse.json({
      student_id: studentId,
      current_stage: currentStage?.stage || null,
      stage_changed_at: currentStage?.stage_changed_at || null,
      history: history.map(h => ({
        stage: h.stage,
        previous_stage: h.previous_stage,
        stage_changed_at: h.stage_changed_at,
        changed_by: h.changed_by,
        change_reason: h.change_reason,
      })),
    });
  } catch (error: any) {
    console.error('CRM Lifecycle History: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
