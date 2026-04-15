import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { refreshSegmentMembers } from '@/lib/crm/segmentation-engine';

/**
 * POST /api/crm/segments/[id]/evaluate
 * Recalculate segment membership based on current criteria.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(authResult.userProfile.role, ['instructor', 'admin', 'super_admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await refreshSegmentMembers(id);

    return NextResponse.json({
      success: true,
      member_count: result.member_count,
      added: result.added,
      removed: result.removed,
    });
  } catch (error: any) {
    console.error('CRM Segment Evaluate: Error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
