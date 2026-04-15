import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { authenticateUser } from '@/lib/api-auth';
import { syncStudents } from '@/lib/sonisweb/student-sync';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasRole(authResult.userProfile.role, ['admin', 'super_admin', 'tenant_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { connection_id } = body;

    if (!connection_id) {
      return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const result = await syncStudents(
      connection_id,
      tenantId,
      authResult.userProfile.id,
      'manual'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Student sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
