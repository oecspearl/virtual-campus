import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { recomputeCourseGradeSummariesForCourse } from '@/lib/services/gradebook-summary';

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
] as const;

const EDITABLE_FIELDS = [
  'category_id',
  'extra_credit',
  'hidden',
  'locked',
  'min_score',
  'sort_order',
  'weight',
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
 * PATCH /api/courses/[id]/gradebook/items/[itemId]
 *
 * Move an item to a different category (`category_id`) or toggle the new
 * flags introduced in migration 047 (`extra_credit`, `hidden`, `locked`,
 * `min_score`, `sort_order`, `weight`).
 *
 * Title/points/type live on the assessment side and are still managed by
 * the existing items POST + quiz-sync routes.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: courseId, itemId } = await params;
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
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of EDITABLE_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: 'No editable fields supplied' },
        { status: 400 }
      );
    }

    // If moving to a category, verify it belongs to this course.
    if ('category_id' in updates && updates.category_id) {
      const { data: cat } = await tq
        .from('course_grade_categories')
        .select('id')
        .eq('id', updates.category_id as string)
        .eq('course_id', courseId)
        .single();
      if (!cat) {
        return NextResponse.json(
          { error: 'Target category not found in this course' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await tq
      .from('course_grade_items')
      .update(updates)
      .eq('id', itemId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error || !data) {
      console.error('Grade item PATCH error:', error);
      return NextResponse.json(
        { error: 'Item not found or update failed' },
        { status: 404 }
      );
    }

    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error('Grade summary recompute failed:', err)
    );

    return NextResponse.json(data);
  } catch (e) {
    console.error('Grade item PATCH error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/[id]/gradebook/items/[itemId]/move-bulk
 * Not used here — bulk move lives at the parent route (`PUT items` —
 * see items/route.ts) so the URL doesn't include a single item id.
 *
 * This file exposes single-item mutations only.
 */
