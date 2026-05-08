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

interface RubricLevel {
  points?: number | string;
}

interface RubricCriterion {
  id?: string;
  levels?: RubricLevel[];
}

/**
 * The max possible grade from a rubric = sum, across criteria, of the
 * highest-points level. The rubric definition lives on
 * assignments.rubric (JSONB or stringified JSON).
 *
 * Returns 0 when the rubric is missing/malformed — callers should
 * treat that as "no scaling possible" and fall back to the unscaled
 * total. Today that path can only fire when the front-end submits
 * scores against an assignment whose rubric was deleted server-side,
 * which is an edge case we don't actively design for.
 */
function computeRubricMax(rubricRaw: unknown): number {
  let rubric: unknown = rubricRaw;
  if (typeof rubric === 'string') {
    try {
      rubric = JSON.parse(rubric);
    } catch {
      return 0;
    }
  }
  if (!Array.isArray(rubric)) return 0;
  let max = 0;
  for (const c of rubric as RubricCriterion[]) {
    const levels = Array.isArray(c?.levels) ? c.levels : [];
    let high = 0;
    for (const lvl of levels) {
      const pts = Number(lvl?.points);
      if (Number.isFinite(pts) && pts > high) high = pts;
    }
    max += high;
  }
  return max;
}

/**
 * Scale a rubric total into the assignment's max points. If the
 * rubric's max-possible (e.g. 90 from a 4×4 grid of 0/3/6/9 levels)
 * exceeds the assignment's points (e.g. 20), this maps the picked
 * total proportionally so the saved grade always fits the assignment.
 *
 * Edge cases:
 *   - rubricMax === 0: no scaling info available; return the unscaled
 *     total. The submission grade column will accept it but
 *     downstream gradebook % may exceed 100. The grader UI should
 *     not normally hit this (a rubric with no levels is empty).
 *   - assignmentMax === 0: return 0 — the assignment is itself
 *     ungradable.
 *   - rubricMax === assignmentMax: identity (no scaling).
 */
function scaleRubricTotal(
  total: number,
  rubricMax: number,
  assignmentMax: number
): number {
  if (assignmentMax <= 0) return 0;
  if (rubricMax <= 0) return total;
  if (rubricMax === assignmentMax) return total;
  return (total / rubricMax) * assignmentMax;
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
    .select('id, course_id, lesson_id, points, rubric')
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

    // Compute the rubric total (raw, in rubric's own scale) and scale
    // to the assignment's max points before mirroring into
    // assignment_submissions.grade. Without this scaling a 4-criteria
    // rubric of 5 levels x 5 points each (max 100) would store 100
    // into a 20-point assignment, which is what the user reported.
    const rubricTotal = scoresInput.reduce(
      (sum, s) => sum + Number(s.points || 0),
      0
    );
    const assignment = await loadAssignmentContext(tq, assignmentId);
    const assignmentMax = Number(assignment?.points ?? 100) || 100;
    const rubricMax = computeRubricMax(assignment?.rubric);
    const scaledGrade = scaleRubricTotal(rubricTotal, rubricMax, assignmentMax);
    // Round to 2 decimals to match the rest of the gradebook surface.
    const finalGrade = Math.round(scaledGrade * 100) / 100;

    const updatePayload: Record<string, unknown> = {
      grade: finalGrade,
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
    // course_grades row, then refresh the cached summary. Using the
    // already-scaled finalGrade so the gradebook agrees with what we
    // wrote into assignment_submissions.grade.
    if (assignment?.course_id) {
      const percentage =
        assignmentMax > 0 ? (finalGrade / assignmentMax) * 100 : 0;

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
                score: finalGrade,
                max_score: assignmentMax,
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
      // The unscaled rubric total (in the rubric's own scale).
      total: rubricTotal,
      // What we actually wrote into assignment_submissions.grade and
      // course_grades after scaling to the assignment's max points.
      grade: finalGrade,
      assignment_max: assignmentMax,
      rubric_max: rubricMax,
    });
  } catch (e) {
    console.error('Rubric scores POST error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
