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

const VALID_AGGREGATIONS = [
  'mean',
  'weighted_mean',
  'simple_weighted_mean',
  'sum',
  'max',
  'min',
  'median',
] as const;

const EDITABLE_FIELDS = [
  'name',
  'parent_id',
  'aggregation',
  'drop_lowest',
  'drop_highest',
  'keep_highest',
  'weight',
  'extra_credit',
  'hidden',
  'sort_order',
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id: courseId, categoryId } = await params;
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

    if (
      'aggregation' in updates &&
      !VALID_AGGREGATIONS.includes(updates.aggregation as never)
    ) {
      return NextResponse.json(
        { error: `aggregation must be one of: ${VALID_AGGREGATIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if ('parent_id' in updates && updates.parent_id === categoryId) {
      return NextResponse.json(
        { error: 'A category cannot be its own parent' },
        { status: 400 }
      );
    }

    const { data, error } = await tq
      .from('course_grade_categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error || !data) {
      console.error('Category update error:', error);
      return NextResponse.json(
        { error: 'Category not found or update failed' },
        { status: 404 }
      );
    }

    // Aggregation/weight/drop changes affect every student in the course.
    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error('Grade summary recompute failed:', err)
    );

    return NextResponse.json(data);
  } catch (e) {
    console.error('Category PATCH error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id: courseId, categoryId } = await params;
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

    // ON DELETE SET NULL on course_grade_items.category_id means orphaned
    // items fall back to the legacy text `category` column / synthetic root.
    const { error } = await tq
      .from('course_grade_categories')
      .delete()
      .eq('id', categoryId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Category delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error('Grade summary recompute failed:', err)
    );

    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error('Category DELETE error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
