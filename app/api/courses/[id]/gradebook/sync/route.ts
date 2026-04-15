import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

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

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedResults.length} quiz scores`,
      results: syncedResults
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
