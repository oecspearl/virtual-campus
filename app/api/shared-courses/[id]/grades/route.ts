import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { hasRole } from '@/lib/rbac';
import { validateCourseShare } from '@/lib/share-validation';

const ASSESSMENT_TYPES = ['quiz', 'assignment', 'discussion', 'survey'] as const;
type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

/**
 * GET /api/shared-courses/[id]/grades
 * Returns cross-tenant grades posted by this tenant for this share.
 *
 * Query params:
 *   student_id — optional; restrict to one student (staff only)
 *
 * Access:
 *   - staff (instructor+): all grades in their tenant for this share
 *   - student: only their own grades
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const authResult = await authenticateUser(request);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const validation = await validateCourseShare(shareId, tenantId);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 404 });
    const share = validation.share!;

    const callerRole = authResult.userProfile!.role;
    const isStaff = hasRole(callerRole, [
      'super_admin', 'tenant_admin', 'admin', 'instructor', 'curriculum_designer',
    ]);

    const url = new URL(request.url);
    const studentIdParam = url.searchParams.get('student_id');

    // Find all enrollment ids in this tenant for this share so we can scope
    // the grade query (cross_tenant_grades is keyed by enrollment_id).
    const enrollmentsQ = tq
      .from('cross_tenant_enrollments')
      .select('id, student_id')
      .eq('source_course_id', share.course_id);

    const { data: enrollments, error: enrollErr } = await enrollmentsQ;
    if (enrollErr) {
      return NextResponse.json({ error: 'Failed to resolve cohort' }, { status: 500 });
    }

    let scopedEnrollments = enrollments || [];
    if (!isStaff) {
      scopedEnrollments = scopedEnrollments.filter((e) => e.student_id === authResult.user!.id);
    } else if (studentIdParam) {
      scopedEnrollments = scopedEnrollments.filter((e) => e.student_id === studentIdParam);
    }

    if (scopedEnrollments.length === 0) {
      return NextResponse.json({ grades: [] });
    }

    const enrollmentIds = scopedEnrollments.map((e) => e.id);
    const { data: grades, error: gradesErr } = await tq
      .from('cross_tenant_grades')
      .select(`
        id, enrollment_id, student_id, assessment_type, assessment_id,
        score, max_score, percentage, graded_at, feedback,
        grader:users!cross_tenant_grades_graded_by_fkey(id, name)
      `)
      .in('enrollment_id', enrollmentIds)
      .order('graded_at', { ascending: false, nullsFirst: false });

    if (gradesErr) {
      console.error('Grades GET error:', gradesErr);
      return NextResponse.json({ error: 'Failed to load grades' }, { status: 500 });
    }

    return NextResponse.json({ grades: grades || [] });
  } catch (error) {
    console.error('Grades GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/shared-courses/[id]/grades
 * Upsert a grade. Requires share.can_post_grades and staff role.
 *
 * Body: { student_id, assessment_type, assessment_id, score?, max_score?, feedback? }
 */
export async function POST(
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
    if (!share.can_post_grades) {
      return NextResponse.json(
        { error: 'Grade posting is not enabled for this share' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const assessmentType = body.assessment_type as AssessmentType;
    const studentId = body.student_id as string;
    const assessmentId = body.assessment_id as string;

    if (!ASSESSMENT_TYPES.includes(assessmentType)) {
      return NextResponse.json(
        { error: `assessment_type must be one of ${ASSESSMENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!studentId || !assessmentId) {
      return NextResponse.json(
        { error: 'student_id and assessment_id are required' },
        { status: 400 }
      );
    }

    // Find the student's enrollment in this share
    const { data: enrollment } = await tq
      .from('cross_tenant_enrollments')
      .select('id')
      .eq('source_course_id', share.course_id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this shared course' },
        { status: 404 }
      );
    }

    const score = body.score !== undefined && body.score !== null ? Number(body.score) : null;
    const maxScore = body.max_score !== undefined && body.max_score !== null ? Number(body.max_score) : null;
    if (score !== null && (!Number.isFinite(score) || score < 0)) {
      return NextResponse.json({ error: 'score must be a non-negative number' }, { status: 400 });
    }
    if (maxScore !== null && (!Number.isFinite(maxScore) || maxScore <= 0)) {
      return NextResponse.json({ error: 'max_score must be a positive number' }, { status: 400 });
    }
    const percentage =
      score !== null && maxScore !== null && maxScore > 0
        ? Math.round((score / maxScore) * 10000) / 100
        : null;

    // Upsert: cross_tenant_grades has UNIQUE(enrollment_id, assessment_type, assessment_id)
    const { data, error } = await tq.raw
      .from('cross_tenant_grades')
      .upsert(
        {
          tenant_id: tenantId,
          enrollment_id: enrollment.id,
          student_id: studentId,
          assessment_type: assessmentType,
          assessment_id: assessmentId,
          score,
          max_score: maxScore,
          percentage,
          graded_at: new Date().toISOString(),
          graded_by: authResult.user!.id,
          feedback: body.feedback ? String(body.feedback) : null,
        },
        { onConflict: 'enrollment_id,assessment_type,assessment_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Grade POST error:', error);
      return NextResponse.json({ error: 'Failed to post grade' }, { status: 500 });
    }

    // Notify the student (in-app, tenant-scoped)
    await tq.from('in_app_notifications').insert({
      user_id: studentId,
      type: 'grade_posted',
      title: 'Grade posted',
      message: `Your ${assessmentType} grade has been posted${percentage !== null ? `: ${percentage.toFixed(1)}%` : ''}.`,
      link_url: `/shared-courses/${shareId}`,
      metadata: { share_id: shareId, assessment_type: assessmentType, assessment_id: assessmentId },
    });

    return NextResponse.json({ grade: data }, { status: 201 });
  } catch (error) {
    console.error('Grades POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
