import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/database-helpers';
import { authenticateUser } from '@/lib/api-auth';
import { pushCourseGrades, pushAllGrades } from '@/lib/sonisweb/grade-passback';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { connection_id, course_id } = body;

    if (!connection_id) {
      return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);

    let result;
    if (course_id) {
      result = await pushCourseGrades(
        connection_id,
        course_id,
        tenantId,
        authResult.userProfile.id,
        'manual'
      );
    } else {
      result = await pushAllGrades(
        connection_id,
        tenantId,
        authResult.userProfile.id,
        'manual'
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Grade passback error:', error);
    return NextResponse.json({ error: error.message || 'Grade passback failed' }, { status: 500 });
  }
}
