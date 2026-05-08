import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
] as const;

async function checkCourseInstructor(
  tq: ReturnType<typeof createTenantQuery>,
  userId: string,
  courseId: string
): Promise<boolean> {
  const { data } = await tq
    .from('course_instructors')
    .select('id')
    .eq('course_id', courseId)
    .eq('instructor_id', userId)
    .single();
  return !!data;
}

/**
 * PUT /api/courses/[id]/gradebook/items/reorder
 *   body: { order: [{ id: string, sort_order: number }] }
 *
 * Bulk-update sort_order for many grade items. Like the categories
 * reorder route, this doesn't affect aggregation totals so we skip
 * recompute. The breakdown UI just shows children in sort_order.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success)
      return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, [...STAFF_ROLES]);
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const order: Array<{ id: string; sort_order: number }> = Array.isArray(
      body?.order
    )
      ? body.order
      : [];

    if (order.length === 0) {
      return NextResponse.json(
        { error: 'order must be a non-empty array of { id, sort_order }' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let updated = 0;
    for (const entry of order) {
      if (!entry.id || typeof entry.sort_order !== 'number') continue;
      const { error } = await tq
        .from('course_grade_items')
        .update({ sort_order: entry.sort_order, updated_at: now })
        .eq('id', entry.id)
        .eq('course_id', courseId);
      if (!error) updated++;
    }

    return NextResponse.json({ updated });
  } catch (e) {
    console.error('Items reorder error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
