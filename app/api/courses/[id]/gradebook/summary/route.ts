import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import {
  recomputeCourseGradeSummary,
  recomputeCourseGradeSummariesForCourse,
} from '@/lib/services/gradebook-summary';

// Grade summaries change every time a grade is written. Force browsers,
// CDNs, and Next's data cache to skip caching this endpoint so the
// student-facing UI always sees fresh data.
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

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
    const wantAll = searchParams.get('all') === '1';

    // Staff variant: GET ?all=1 returns every cached summary in the course.
    // Used by the admin gradebook to display engine-computed totals + letters
    // without fanning out one fetch per student.
    //
    // If the cache is cold (no grade has triggered a recompute since the
    // tables were created), warm it for every enrolled student in one
    // pass before returning. Mirrors the single-student GET's on-demand
    // behaviour so the admin never sees a stale-empty list when grades exist.
    if (wantAll) {
      if (!isStaff) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const fetchSummaries = async () =>
        tq
          .from('course_grade_summary')
          .select('student_id, percentage, letter, breakdown, computed_at')
          .eq('course_id', courseId);

      let { data: rows, error: listError } = await fetchSummaries();
      if (listError) {
        console.error('Grade summary list error:', listError);
        return NextResponse.json(
          { error: 'Failed to fetch grade summaries' },
          { status: 500 }
        );
      }

      // Decide whether to warm: rebuild if the cached row count is behind
      // the enrolled student count, OR if any grade has been written since
      // the oldest cache row was computed. This catches both the cold-cache
      // case AND the case where a write path forgot to call recompute.
      const { count: enrolledCount } = await tq
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active');

      const cachedCount = rows?.length ?? 0;

      let cacheStale = false;
      if (cachedCount > 0) {
        const oldestComputedAt = (rows ?? [])
          .map((r) => r.computed_at)
          .sort()[0];
        const { data: latestGrade } = await tq
          .from('course_grades')
          .select('updated_at')
          .eq('course_id', courseId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (
          latestGrade?.updated_at &&
          oldestComputedAt &&
          new Date(latestGrade.updated_at) > new Date(oldestComputedAt)
        ) {
          cacheStale = true;
        }
      }

      if ((enrolledCount ?? 0) > cachedCount || cacheStale) {
        try {
          await recomputeCourseGradeSummariesForCourse(tq, courseId);
          ({ data: rows, error: listError } = await fetchSummaries());
          if (listError) {
            console.error('Grade summary re-list error:', listError);
            return NextResponse.json(
              { error: 'Failed to fetch grade summaries after recompute' },
              { status: 500 }
            );
          }
        } catch (recomputeErr) {
          console.error('Bulk recompute on cold cache failed:', recomputeErr);
        }
      }

      return NextResponse.json(
        { summaries: rows ?? [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

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

    const fetchSingle = async () =>
      tq
        .from('course_grade_summary')
        .select('percentage, letter, breakdown, computed_at')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .maybeSingle();

    // Always recompute on read. The cache row exists so other readers
    // (admin ?all=1, programmatic consumers) see fresh-as-of-last-write
    // data without round-tripping through the engine, but the canonical
    // "what does this student see right now" path is the recompute.
    // This costs a few extra indexed queries per read; cheap relative to
    // the freshness win.
    try {
      await recomputeCourseGradeSummary(tq, courseId, studentId);
    } catch (recomputeErr) {
      console.error('Per-read recompute failed:', recomputeErr);
    }

    const { data: summary, error } = await fetchSingle();

    if (error) {
      console.error('Grade summary fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch grade summary' },
        { status: 500 }
      );
    }

    if (!summary) {
      return NextResponse.json(
        {
          course_id: courseId,
          student_id: studentId,
          percentage: null,
          letter: null,
          breakdown: [],
          computed_at: new Date().toISOString(),
          computed_on_demand: true,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        course_id: courseId,
        student_id: studentId,
        ...summary,
      },
      { headers: NO_CACHE_HEADERS }
    );
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
