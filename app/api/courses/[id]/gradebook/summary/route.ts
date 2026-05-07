import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import {
  recomputeCourseGradeSummary,
  recomputeCourseGradeSummariesForCourse,
} from '@/lib/services/gradebook-summary';

/**
 * GET /api/courses/[id]/gradebook/summary
 *   ?student_id=<uuid>  (staff only — defaults to caller for students)
 *
 * Returns the cached `course_grade_summary` row for the (course, student).
 * Students can only read their own; staff can read anyone in the course.
 *
 * POST /api/courses/[id]/gradebook/summary
 *   body: { student_id?: string }    — recompute one student
 *   body: { all: true }              — recompute every enrolled student
 *
 * Recomputation runs the pure aggregation engine and upserts the cached
 * row. Hooked from grade-write paths to keep the cache fresh; this manual
 * trigger is a safety net + dev tool.
 */

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
    const isAdmin = hasRole(user.role, [
      'admin',
      'super_admin',
      'tenant_admin',
      'curriculum_designer',
    ]);
    const isStaff = isInstructor || isAdmin;

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get('student_id');
    const studentId = requestedStudentId ?? user.id;

    if (!isStaff && studentId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (!isStaff) {
      const enrolled = await checkEnrollment(tq, user.id, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { data: summary, error } = await tq
      .from('course_grade_summary')
      .select('percentage, letter, breakdown, computed_at')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Grade summary fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch grade summary' },
        { status: 500 }
      );
    }

    if (!summary) {
      // No cached summary yet — compute on demand. Cheap, and avoids the
      // chicken-and-egg case where a course has grades but the summary
      // table was populated before this code shipped.
      const fresh = await recomputeCourseGradeSummary(tq, courseId, studentId);
      return NextResponse.json({
        course_id: courseId,
        student_id: studentId,
        percentage: fresh.percentage,
        letter: fresh.letter,
        breakdown: [],
        computed_at: new Date().toISOString(),
        computed_on_demand: true,
      });
    }

    return NextResponse.json({
      course_id: courseId,
      student_id: studentId,
      ...summary,
    });
  } catch (e: unknown) {
    console.error('Grade summary GET error:', e);
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
    const isAdmin = hasRole(user.role, [
      'admin',
      'super_admin',
      'tenant_admin',
      'curriculum_designer',
    ]);
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    if (body?.all === true) {
      const result = await recomputeCourseGradeSummariesForCourse(tq, courseId);
      return NextResponse.json({ recomputed: 'course', ...result });
    }

    const studentId: string | undefined = body?.student_id;
    if (!studentId) {
      return NextResponse.json(
        { error: 'student_id or all=true is required' },
        { status: 400 }
      );
    }

    const result = await recomputeCourseGradeSummary(tq, courseId, studentId);
    return NextResponse.json({ recomputed: 'student', ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    console.error('Grade summary POST error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
