import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { recomputeCourseGradeSummariesForCourse } from '@/lib/services/gradebook-summary';

/**
 * /api/courses/[id]/gradebook/categories
 *
 *   GET   — list categories for a course (any course member)
 *   POST  — create a new category (staff only)
 *
 * Sub-route /[categoryId] handles update and delete.
 */

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

async function checkEnrollment(
  tq: ReturnType<typeof createTenantQuery>,
  userId: string,
  courseId: string
): Promise<boolean> {
  const { data } = await tq
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .eq('status', 'active')
    .single();
  return !!data;
}

export async function GET(
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
      const enrolled = await checkEnrollment(tq, user.id, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { data, error } = await tq
      .from('course_grade_categories')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data ?? [] });
  } catch (e) {
    console.error('Categories GET error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();
    const {
      name,
      parent_id = null,
      aggregation = 'weighted_mean',
      drop_lowest = 0,
      drop_highest = 0,
      keep_highest = null,
      weight = null,
      extra_credit = false,
      hidden = false,
      sort_order = 0,
      display_color = null,
    } = body ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }
    if (!VALID_AGGREGATIONS.includes(aggregation)) {
      return NextResponse.json(
        { error: `aggregation must be one of: ${VALID_AGGREGATIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (
      display_color != null &&
      (typeof display_color !== 'string' ||
        !/^#[0-9A-Fa-f]{6}$/.test(display_color))
    ) {
      return NextResponse.json(
        { error: 'display_color must be a #RRGGBB hex string or null' },
        { status: 400 }
      );
    }

    const { data, error } = await tq
      .from('course_grade_categories')
      .insert({
        course_id: courseId,
        parent_id,
        name,
        aggregation,
        drop_lowest,
        drop_highest,
        keep_highest,
        weight,
        extra_credit,
        hidden,
        sort_order,
        display_color,
      })
      .select()
      .single();

    if (error) {
      console.error('Category insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    // New empty category doesn't change anyone's grade yet, but we still
    // bump the cache so breakdown labels stay in sync.
    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error('Grade summary recompute failed:', err)
    );

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('Categories POST error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
