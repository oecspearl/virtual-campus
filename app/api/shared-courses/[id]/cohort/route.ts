import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { validateCourseShare } from '@/lib/share-validation';

/**
 * GET /api/shared-courses/[id]/cohort
 *
 * Returns the target-tenant students currently or previously enrolled in the
 * shared course. Used by the gradebook surface. Staff-only (instructor+).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    if (!hasRole(authResult.userProfile!.role, [
      'super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer',
    ])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await validateCourseShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });
    const share = validation.share!;

    const { data, error } = await tq
      .from('cross_tenant_enrollments')
      .select(`
        id, status, enrolled_at, completed_at, progress_percentage,
        student:users!cross_tenant_enrollments_student_id_fkey(id, name, email, avatar)
      `)
      .eq('source_course_id', share.course_id)
      .order('enrolled_at', { ascending: true });

    if (error) {
      console.error('Cohort GET error:', error);
      return NextResponse.json({ error: 'Failed to load cohort' }, { status: 500 });
    }

    return NextResponse.json({ enrollments: data || [] });
  } catch (error) {
    console.error('Cohort GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
