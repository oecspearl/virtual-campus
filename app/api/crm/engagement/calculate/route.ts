import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { calculateEngagementScore, calculateAllEngagementScores } from '@/lib/crm/engagement-engine';

/**
 * POST /api/crm/engagement/calculate
 * Trigger engagement score recalculation.
 * Body: { student_id?: uuid, course_id?: uuid } -- omit both for all students.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { student_id, course_id } = body;

    if (student_id) {
      const result = await calculateEngagementScore(student_id, course_id);
      return NextResponse.json({ success: true, score: result });
    }

    const results = await calculateAllEngagementScores();
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error('CRM Engagement Calculate: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
