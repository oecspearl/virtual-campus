import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';

// GET /api/courses/[id]/my-assessment-status
//
// Returns the current user's submission/attempt status for every quiz and
// assignment in the course. Used by the student-facing Assessments tab to
// badge each row ("Submitted", "Graded · 85/100", "In progress", etc.).
//
// Shape:
// {
//   assignments: { [assignmentId]: { status, grade, submitted_at, late } },
//   quizzes:     { [quizId]:       { status, score, max_score, percentage, attempt_number, submitted_at } }
// }
//
// Items the user has not yet engaged with are simply absent from the maps.
type AssignmentStatus = {
  status: 'draft' | 'submitted' | 'graded';
  grade: number | null;
  submitted_at: string | null;
  late: boolean;
};

type QuizStatus = {
  status: 'in_progress' | 'submitted' | 'graded';
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  attempt_number: number;
  submitted_at: string | null;
};

const ASSIGNMENT_STATUS_RANK: Record<AssignmentStatus['status'], number> = {
  graded: 3,
  submitted: 2,
  draft: 1,
};

const QUIZ_STATUS_RANK: Record<QuizStatus['status'], number> = {
  graded: 3,
  submitted: 2,
  in_progress: 1,
};

export const GET = withTenantAuth(async ({ user, tq, request }) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const courseId = segments[segments.indexOf('courses') + 1];

    if (!courseId) {
      return NextResponse.json({ error: 'Course id missing' }, { status: 400 });
    }

    // Resolve the assignment and quiz ids that belong to this course
    // (directly via course_id or indirectly via a lesson under the course).
    const { data: courseLessons } = await tq
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);
    const lessonIds = (courseLessons || []).map((l: { id: string }) => l.id);

    const buildScopeFilter = (qBase: any) => {
      if (lessonIds.length > 0) {
        return qBase.or(
          `course_id.eq.${courseId},lesson_id.in.(${lessonIds.join(',')})`,
        );
      }
      return qBase.eq('course_id', courseId);
    };

    const [{ data: courseAssignments }, { data: courseQuizzes }] = await Promise.all([
      buildScopeFilter(tq.from('assignments').select('id')),
      buildScopeFilter(tq.from('quizzes').select('id')),
    ]);

    const assignmentIds = (courseAssignments || []).map((a: { id: string }) => a.id);
    const quizIds = (courseQuizzes || []).map((q: { id: string }) => q.id);

    // Fetch this user's rows in parallel. Use empty arrays as no-ops to
    // avoid sending an `.in('id', [])` filter that produces invalid SQL on
    // some Postgres versions.
    const submissionsPromise = assignmentIds.length
      ? tq
          .from('assignment_submissions')
          .select('assignment_id, status, grade, submitted_at, late, updated_at')
          .eq('student_id', user.id)
          .in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [], error: null });

    const attemptsPromise = quizIds.length
      ? tq
          .from('quiz_attempts')
          .select(
            'quiz_id, status, score, max_score, percentage, attempt_number, submitted_at, updated_at',
          )
          .eq('student_id', user.id)
          .in('quiz_id', quizIds)
      : Promise.resolve({ data: [], error: null });

    const [submissionsResult, attemptsResult] = await Promise.all([
      submissionsPromise,
      attemptsPromise,
    ]);

    if (submissionsResult.error) {
      console.error('my-assessment-status submissions error:', submissionsResult.error);
    }
    if (attemptsResult.error) {
      console.error('my-assessment-status attempts error:', attemptsResult.error);
    }

    // Reduce each assignment to its single best row. A student often has
    // exactly one submission row that mutates draft → submitted → graded,
    // but we don't depend on that — pick by status rank, then by latest
    // updated_at.
    const assignments: Record<string, AssignmentStatus> = {};
    for (const row of submissionsResult.data || []) {
      const existing = assignments[row.assignment_id];
      const candidate: AssignmentStatus = {
        status: row.status,
        grade: row.grade ?? null,
        submitted_at: row.submitted_at ?? null,
        late: !!row.late,
      };
      if (!existing) {
        assignments[row.assignment_id] = candidate;
        continue;
      }
      const newRank = ASSIGNMENT_STATUS_RANK[candidate.status] ?? 0;
      const oldRank = ASSIGNMENT_STATUS_RANK[existing.status] ?? 0;
      if (
        newRank > oldRank ||
        (newRank === oldRank &&
          (row.updated_at ?? '') > (existing.submitted_at ?? ''))
      ) {
        assignments[row.assignment_id] = candidate;
      }
    }

    // For quizzes, prefer the highest-scoring submitted/graded attempt.
    // If only in_progress attempts exist, return the latest one so we can
    // show "In progress" in the UI.
    const quizzes: Record<string, QuizStatus> = {};
    for (const row of attemptsResult.data || []) {
      const candidate: QuizStatus = {
        status: row.status,
        score: row.score ?? null,
        max_score: row.max_score ?? null,
        percentage: row.percentage != null ? Number(row.percentage) : null,
        attempt_number: row.attempt_number ?? 1,
        submitted_at: row.submitted_at ?? null,
      };
      const existing = quizzes[row.quiz_id];
      if (!existing) {
        quizzes[row.quiz_id] = candidate;
        continue;
      }
      const newRank = QUIZ_STATUS_RANK[candidate.status] ?? 0;
      const oldRank = QUIZ_STATUS_RANK[existing.status] ?? 0;
      if (newRank > oldRank) {
        quizzes[row.quiz_id] = candidate;
      } else if (newRank === oldRank) {
        // Same rank: pick the better outcome. For submitted/graded that's
        // the higher percentage; for in_progress, that's the latest.
        if (candidate.status === 'in_progress') {
          if ((row.updated_at ?? '') > (existing.submitted_at ?? '')) {
            quizzes[row.quiz_id] = candidate;
          }
        } else if ((candidate.percentage ?? -1) > (existing.percentage ?? -1)) {
          quizzes[row.quiz_id] = candidate;
        }
      }
    }

    return NextResponse.json({ assignments, quizzes });
  } catch (error) {
    console.error('my-assessment-status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
