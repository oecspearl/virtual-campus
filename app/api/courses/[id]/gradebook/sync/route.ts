import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { recomputeCourseGradeSummariesForCourse } from "@/lib/services/gradebook-summary";
import { syncAssessmentToGradebook } from "@/lib/services/gradebook-service";

interface QuizRow {
  id: string;
  title: string | null;
  course_id: string | null;
  lesson_id: string | null;
  points: number | null;
  due_date: string | null;
}

/**
 * Sum the points across questions for a quiz. Quiz `points` defaults
 * to 0 in the schema; the question total is what attempts are scored
 * against, so use it when the quiz row's own points field is empty.
 */
async function calculateQuizTotalPoints(
  tq: ReturnType<typeof createTenantQuery>,
  quizId: string
): Promise<number> {
  const { data: questions } = await tq
    .from('questions')
    .select('points')
    .eq('quiz_id', quizId);
  if (!questions) return 0;
  return (questions as Array<{ points: number | null }>).reduce(
    (sum, q) => sum + Number(q.points ?? 0),
    0
  );
}

/**
 * Find every quiz in this course that has at least one graded attempt
 * but no matching course_grade_items row, and create the missing row
 * via syncAssessmentToGradebook. After this runs the per-attempt sync
 * loop below picks up everything.
 */
async function backfillMissingQuizGradeItems(
  tq: ReturnType<typeof createTenantQuery>,
  courseId: string
): Promise<{ created: number; skippedNoPoints: string[] }> {
  // 1. Quizzes whose course_id matches the target.
  const { data: courseQuizzes } = await tq
    .from('quizzes')
    .select('id, title, course_id, lesson_id, points, due_date')
    .eq('course_id', courseId);

  // 2. Quizzes attached to lessons that belong to this course (legacy
  //    rows where quizzes.course_id is null but lessons.course_id is set).
  const { data: courseLessons } = await tq
    .from('lessons')
    .select('id')
    .eq('course_id', courseId);
  const lessonIds = (courseLessons ?? []).map((l: { id: string }) => l.id);

  const { data: lessonQuizzes } =
    lessonIds.length > 0
      ? await tq
          .from('quizzes')
          .select('id, title, course_id, lesson_id, points, due_date')
          .in('lesson_id', lessonIds)
      : { data: [] as QuizRow[] };

  const allQuizzesById = new Map<string, QuizRow>();
  for (const q of (courseQuizzes ?? []) as QuizRow[]) allQuizzesById.set(q.id, q);
  for (const q of (lessonQuizzes ?? []) as QuizRow[]) allQuizzesById.set(q.id, q);

  if (allQuizzesById.size === 0) return { created: 0, skippedNoPoints: [] };

  const quizIds = Array.from(allQuizzesById.keys());

  // 3. Existing grade items for these quizzes — anything in this set is
  //    already covered by the main sync loop and doesn't need a backfill.
  const { data: existingItems } = await tq
    .from('course_grade_items')
    .select('assessment_id')
    .eq('course_id', courseId)
    .eq('type', 'quiz')
    .in('assessment_id', quizIds);
  const haveItem = new Set(
    (existingItems ?? []).map(
      (i: { assessment_id: string | null }) => i.assessment_id
    )
  );

  // 4. Quizzes that have at least one graded attempt — only those are
  //    worth backfilling. A graded item on a quiz no one attempted
  //    just clutters the gradebook.
  const { data: gradedAttempts } = await tq
    .from('quiz_attempts')
    .select('quiz_id')
    .in('quiz_id', quizIds)
    .eq('status', 'graded');
  const haveAttempts = new Set(
    (gradedAttempts ?? []).map((a: { quiz_id: string }) => a.quiz_id)
  );

  let created = 0;
  const skippedNoPoints: string[] = [];

  for (const [quizId, quiz] of allQuizzesById) {
    if (haveItem.has(quizId)) continue;
    if (!haveAttempts.has(quizId)) continue;

    let points = Number(quiz.points ?? 0);
    if (points <= 0) points = await calculateQuizTotalPoints(tq, quizId);
    if (points <= 0) {
      // We can't honestly create a grade item with 0 max — skip and
      // surface in the response so staff can fix the quiz.
      skippedNoPoints.push(quiz.title || quizId);
      continue;
    }

    try {
      await syncAssessmentToGradebook(tq, {
        courseId,
        assessmentId: quizId,
        type: 'quiz',
        title: quiz.title || 'Quiz',
        points,
        dueDate: quiz.due_date,
      });
      created++;
    } catch (err) {
      console.error(`[Gradebook Sync] Failed to create grade item for quiz ${quizId}:`, err);
    }
  }

  return { created, skippedNoPoints };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // First pass: backfill grade items for any quiz in this course that
    // has graded attempts but no entry in the gradebook yet. Without
    // this the sync loop below silently skips those quizzes — which is
    // exactly the "the quiz was taken but the grade isn't counted"
    // scenario.
    const backfill = await backfillMissingQuizGradeItems(tq, courseId);

    // Get all activated quizzes for this course
    const { data: gradeItems, error: itemsError } = await tq
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .eq("type", "quiz");

    if (itemsError) {
      console.error('[Gradebook Sync] Error fetching grade items:', itemsError);
      return NextResponse.json({ error: "Failed to fetch grade items", details: itemsError.message }, { status: 500 });
    }

    if (!gradeItems) {
      return NextResponse.json({ error: "Failed to fetch grade items" }, { status: 500 });
    }

    const syncedResults = [];

    for (const item of gradeItems) {
      if (!item.assessment_id) continue;

      // Get all quiz attempts for this quiz, ordered by best score first
      const { data: attempts, error: attemptsError } = await tq
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", item.assessment_id)
        .eq("status", "graded")
        .order("percentage", { ascending: false })
        .order("submitted_at", { ascending: false });

      if (attemptsError) {
        console.error(`[Gradebook Sync] Error fetching attempts for quiz ${item.assessment_id}:`, attemptsError);
        continue;
      }

      if (!attempts) continue;

      // Group attempts by student and get the best attempt for each student
      const bestAttemptsByStudent = new Map();
      for (const attempt of attempts) {
        const studentId = attempt.student_id;
        if (!bestAttemptsByStudent.has(studentId) ||
            attempt.percentage > bestAttemptsByStudent.get(studentId).percentage) {
          bestAttemptsByStudent.set(studentId, attempt);
        }
      }

      // Process only the best attempt for each student
      for (const attempt of bestAttemptsByStudent.values()) {
        // Check if grade already exists - use maybeSingle() to handle cases where no grade exists
        const { data: existingGrade, error: gradeCheckError } = await tq
          .from("course_grades")
          .select("id")
          .eq("course_id", courseId)
          .eq("student_id", attempt.student_id)
          .eq("grade_item_id", item.id)
          .maybeSingle();

        if (gradeCheckError) {
          console.error(`[Gradebook Sync] Error checking existing grade:`, gradeCheckError);
          continue;
        }

        if (existingGrade) {
          // Update existing grade
          const percentage = item.points > 0 ? (attempt.score / item.points) * 100 : 0;

          const { error: updateError } = await tq
            .from("course_grades")
            .update({
              score: attempt.score,
              max_score: item.points,
              percentage: Number(percentage.toFixed(2)),
              updated_at: new Date().toISOString()
            })
            .eq("id", existingGrade.id);

          if (updateError) {
            console.error(`[Gradebook Sync] Error updating grade:`, updateError);
            continue;
          }

          syncedResults.push({
            student_id: attempt.student_id,
            quiz_id: item.assessment_id,
            action: 'updated',
            score: attempt.score
          });
        } else {
          // Create new grade
          const percentage = item.points > 0 ? (attempt.score / item.points) * 100 : 0;

          const { error: createError } = await tq
            .from("course_grades")
            .insert([{
              course_id: courseId,
              student_id: attempt.student_id,
              grade_item_id: item.id,
              score: attempt.score,
              max_score: item.points,
              percentage: Number(percentage.toFixed(2)),
              graded_at: attempt.submitted_at,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (createError) {
            console.error(`[Gradebook Sync] Error creating grade:`, createError);
            continue;
          }

          syncedResults.push({
            student_id: attempt.student_id,
            quiz_id: item.assessment_id,
            action: 'created',
            score: attempt.score
          });
        }
      }
    }

    if (syncedResults.length > 0) {
      recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
        console.error('Grade summary recompute failed after quiz sync:', err)
      );
    }

    const messageParts = [`Synced ${syncedResults.length} quiz scores`];
    if (backfill.created > 0) {
      messageParts.push(`backfilled ${backfill.created} missing grade item(s)`);
    }
    if (backfill.skippedNoPoints.length > 0) {
      messageParts.push(
        `skipped ${backfill.skippedNoPoints.length} quiz(zes) with 0 points`
      );
    }

    return NextResponse.json({
      success: true,
      message: messageParts.join('; '),
      results: syncedResults,
      backfilled: backfill.created,
      skippedNoPoints: backfill.skippedNoPoints,
    });

  } catch (e: any) {
    console.error('Quiz sync API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(tq: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await tq
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .single();

  return !!data;
}
