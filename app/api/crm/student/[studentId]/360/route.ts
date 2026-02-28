import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/database-helpers';
import { getStudent360 } from '@/lib/crm/student-360';

/**
 * GET /api/crm/student/[studentId]/360
 * Get the aggregated Student 360 profile.
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

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await params;
    const data = await getStudent360(studentId);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CRM Student 360: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
