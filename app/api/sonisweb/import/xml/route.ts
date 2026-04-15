import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { getTenantIdFromRequest } from '@/lib/tenant-query';
import {
  importPersonsBatch,
  importGroupsBatch,
  importMembershipsBatch,
} from '@/lib/sonisweb/batch-import';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    if (!hasRole(userProfile.role, ['admin', 'tenant_admin', 'super_admin'])) {
      return createAuthResponse('Forbidden: Admin access required', 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const body = await request.json();
    const { type, batch, personIdMap, groupIdMap, options } = body;

    if (!type || !batch || !Array.isArray(batch)) {
      return NextResponse.json({ error: 'Missing type or batch array' }, { status: 400 });
    }

    switch (type) {
      case 'persons': {
        const result = await importPersonsBatch(batch, tenantId, {
          defaultStudentRole: options?.defaultStudentRole || 'student',
        });
        return NextResponse.json(result);
      }

      case 'groups': {
        const result = await importGroupsBatch(batch, tenantId, {
          publishCourses: options?.publishCourses === true,
          defaultModality: options?.defaultModality || 'online',
        });
        return NextResponse.json(result);
      }

      case 'memberships': {
        if (!personIdMap || !groupIdMap) {
          return NextResponse.json({ error: 'Missing personIdMap or groupIdMap for memberships' }, { status: 400 });
        }
        const result = await importMembershipsBatch(batch, tenantId, personIdMap, groupIdMap, {
          defaultInstructorRole: options?.defaultInstructorRole || 'instructor',
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown batch type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
