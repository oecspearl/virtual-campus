import { NextResponse } from 'next/server';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser, createAuthResponse } from '@/lib/api-auth';
import { hasRole } from '@/lib/rbac';
import { recomputeCourseGradeSummary } from '@/lib/services/gradebook-summary';

const STAFF_ROLES = [
  'admin',
  'super_admin',
  'tenant_admin',
  'curriculum_designer',
  'instructor',
] as const;

interface ScoreInput {
  criterion_id: string;
  level_index: number | null;
  points: number;
  comment?: string;
}

/**
 * GET — current rubric selections for a submission.
 *   Visible to: the student who owns the submission, plus staff.
 *
 * POST — staff replaces the full set of scores for a submission.
 *   Body: { scores: ScoreInput[], feedback?: string }
 *   Side-effects: total points are summed and mirrored into
 *   assignment_submissions.grade. The course grade summary is
 *   recomputed for the affected student so the gradebook stays fresh.
 */

async function loadAssignmentContext(
  tq: ReturnType<typeof createTenantQuery>,
  assignmentId: string
) {
  const { data: assignment } = await tq
    .from('assignments')
    .select('id, course_id, lesson_id, points')
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignment?.course_id) return assignment;

  // Fallback: derive course_id via the lesson, mirroring the path the
  // grade endpoint already uses.
  if (assignment?.lesson_id) {
    const { data: lesson } = await tq
      .from('lessons')
      .select('course_id')
      .eq('id', assignment.lesson_id)
      .maybeSingle();
    return { ...assignment, course_id: lesson?.course_id ?? null };
  }

  return assignment;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success)
      return createAuthResponse(authResult.error!, authResult.status!);

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { data: scores, error } = await tq
      .from('assignment_submission_rubric_scores')
      .select('criterion_id, level_index, points, comment, graded_at')
      .eq('submission_id', submissionId);

    if (error) {
      console.error('Rubric scores fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rubric scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({ scores: scores ?? [] });
  } catch (e) {
    console.error('Rubric scores GET error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: assignmentId, submissionId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success)
      return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    if (!hasRole(user.role, [...STAFF_ROLES])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const serviceSupabase = createServiceSupabaseClient();

    const body = await request.json().catch(() => ({}));
    const scoresInput: ScoreInput[] = Array.isArray(body?.scores)
      ? body.scores
      : [];
    const feedback: string | null =
      typeof body?.feedback === 'string' ? body.feedback : null;

    // Validate every score row.
    for (const s of scoresInput) {
      if (!s.criterion_id || typeof s.criterion_id !== 'string') {
        return NextResponse.json(
          { error: 'Each score needs a criterion_id' },
          { status: 400 }
        );
      }
      if (!Number.isFinite(s.points)) {
        return NextResponse.json(
          { error: 'Each score needs a numeric points value' },
          { status: 400 }
        );
      }
    }

    // Verify the submission belongs to this assignment.
    const { data: submission } = await tq
      .from('assignment_submissions')
      .select('id, student_id, assignment_id')
      .eq('id', submissionId)
      .maybeSingle();
    if (!submission || submission.assignment_id !== assignmentId) {
      return NextResponse.json(
        { error: 'Submission not found for this assignment' },
        { status: 404 }
      );
    }

    // Replace the full set: delete existing rows then insert the new
    // ones. Cheap (rubric criteria count is small) and avoids the
    // complexity of reconciling per-row.
    const now = new Date().toISOString();
    await tq
      .from('assignment_submission_rubric_scores')
      .delete()
      .eq('submission_id', submissionId);

    if (scoresInput.length > 0) {
      const rows = scoresInput.map((s) => ({
        submission_id: submissionId,
        criterion_id: s.criterion_id,
        level_index: s.level_index ?? null,
        points: s.points,
        comment: s.comment ?? null,
        graded_by: user.id,
        graded_at: now,
      }));
      const { error: insertError } = await tq
        .from('assignment_submission_rubric_scores')
        .insert(rows);
      if (insertError) {
        console.error('Rubric scores insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to save rubric scores' },
          { status: 500 }
        );
      }
    }

    // Mirror the rubric total into assignment_submissions.grade and
    // optionally update feedback.
    const total = scoresInput.reduce((sum, s) => sum + Number(s.points || 0), 0);
    const updatePayload: Record<string, unknown> = {
      grade: total,
      status: 'graded',
      graded_by: user.id,
      graded_at: now,
      updated_at: now,
    };
    if (feedback !== null) updatePayload.feedback = feedback;

    const { error: gradeError } = await tq
      .from('assignment_submissions')
      .update(updatePayload)
      .eq('id', submissionId);
    if (gradeError) {
      console.error('Submission grade mirror error:', gradeError);
      return NextResponse.json(
        { error: 'Failed to update submission grade' },
        { status: 500 }
      );
    }

    // Sync into the gradebook the same way the regular /grade endpoint
    // does: find the matching course_grade_items row and upsert the
    // course_grades row, then refresh the cached summary.
    const assignment = await loadAssignmentContext(tq, assignmentId);
    if (assignment?.course_id) {
      const maxPoints = Number(assignment.points ?? 100) || 100;
      const percentage = maxPoints > 0 ? (total / maxPoints) * 100 : 0;

      const { data: gradeItem } = await serviceSupabase
        .from('course_grade_items')
        .select('id')
        .eq('course_id', assignment.course_id)
        .eq('type', 'assignment')
        .eq('assessment_id', assignmentId)
        .maybeSingle();

      if (gradeItem) {
        await serviceSupabase
          .from('course_grades')
          .upsert(
            [
              {
                course_id: assignment.course_id,
                student_id: submission.student_id,
                grade_item_id: gradeItem.id,
                score: total,
                max_score: maxPoints,
                percentage: Number(percentage.toFixed(2)),
                feedback: feedback ?? null,
                graded_by: user.id,
                graded_at: now,
                created_at: now,
                updated_at: now,
                tenant_id: tenantId,
              },
            ],
            { onConflict: 'student_id,grade_item_id' }
          );
      }

      try {
        await recomputeCourseGradeSummary(
          tq,
          assignment.course_id,
          submission.student_id
        );
      } catch (recomputeErr) {
        console.error('Grade summary recompute failed:', recomputeErr);
      }
    }

    return NextResponse.json({
      saved: scoresInput.length,
      total,
    });
  } catch (e) {
    console.error('Rubric scores POST error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
