import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { getEngagementTrend } from '@/lib/crm/engagement-engine';

/**
 * GET /api/crm/engagement
 * Get engagement scores for a student, optionally filtered by course and date range.
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
    const studentId = searchParams.get('student_id');
    const courseId = searchParams.get('course_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    let query = tq
      .from('crm_engagement_scores')
      .select('*')
      .eq('student_id', studentId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    } else {
      query = query.is('course_id', null);
    }

    if (from) query = query.gte('score_date', from);
    if (to) query = query.lte('score_date', to);

    const { data, error } = await query.order('score_date', { ascending: false }).limit(90);

    if (error) {
      console.error('CRM Engagement: Fetch error', error);
      return NextResponse.json({ error: 'Failed to fetch engagement scores' }, { status: 500 });
    }

    const trend = await getEngagementTrend(studentId);

    return NextResponse.json({
      scores: data || [],
      trend,
      latest: data && data.length > 0 ? data[0] : null,
    });
  } catch (error: any) {
    console.error('CRM Engagement: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
