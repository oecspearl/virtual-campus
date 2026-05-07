import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { recomputeCourseGradeSummariesForCourse } from '@/lib/services/gradebook-summary';

/**
 * /api/courses/[id]/gradebook/letter-scale
 *
 *   GET — list letter bands for the course
 *   PUT — replace the entire scale with the supplied bands (delete-then-insert)
 *
 * The scale is small (typically 5–13 rows) so a full replace keeps the
 * mental model simple — no per-band PATCH endpoints needed.
 */

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
] as const;

interface LetterBandInput {
  letter: string;
  min_percentage: number;
  sort_order?: number;
}

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
      .from('course_grade_letters')
      .select('letter, min_percentage, sort_order')
      .eq('course_id', courseId)
      .order('min_percentage', { ascending: false });

    if (error) {
      console.error('Letter-scale fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch letter scale' },
        { status: 500 }
      );
    }

    return NextResponse.json({ scale: data ?? [] });
  } catch (e) {
    console.error('Letter-scale GET error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const bands: LetterBandInput[] = Array.isArray(body?.scale) ? body.scale : [];

    for (const b of bands) {
      if (!b.letter || typeof b.letter !== 'string') {
        return NextResponse.json(
          { error: 'Each band needs a non-empty letter' },
          { status: 400 }
        );
      }
      if (
        typeof b.min_percentage !== 'number' ||
        b.min_percentage < 0 ||
        b.min_percentage > 100
      ) {
        return NextResponse.json(
          { error: 'min_percentage must be a number 0..100' },
          { status: 400 }
        );
      }
    }

    const seenLetters = new Set<string>();
    for (const b of bands) {
      if (seenLetters.has(b.letter)) {
        return NextResponse.json(
          { error: `Duplicate letter: ${b.letter}` },
          { status: 400 }
        );
      }
      seenLetters.add(b.letter);
    }

    const { error: deleteError } = await tq
      .from('course_grade_letters')
      .delete()
      .eq('course_id', courseId);
    if (deleteError) {
      console.error('Letter-scale delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to replace letter scale' },
        { status: 500 }
      );
    }

    if (bands.length > 0) {
      const rows = bands.map((b, i) => ({
        course_id: courseId,
        letter: b.letter,
        min_percentage: b.min_percentage,
        sort_order: b.sort_order ?? i,
      }));
      const { error: insertError } = await tq
        .from('course_grade_letters')
        .insert(rows);
      if (insertError) {
        console.error('Letter-scale insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to write letter scale' },
          { status: 500 }
        );
      }
    }

    // New scale → existing summaries have stale letters.
    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error('Grade summary recompute failed:', err)
    );

    return NextResponse.json({ replaced: true, count: bands.length });
  } catch (e) {
    console.error('Letter-scale PUT error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
