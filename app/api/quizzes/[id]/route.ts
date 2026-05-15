import { NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';
import { updateAssessmentInGradebook } from '@/lib/services/gradebook-service';
import { createLogger, logger } from "@/lib/logger";

// Quizzes don't store total points directly — they're the sum of question
// points. Mirror the calculation used by the legacy /gradebook/quiz-sync
// endpoint so the gradebook always shows the right total after an edit.
async function calculateQuizTotalPoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tq: any,
  quizId: string,
): Promise<number> {
  const { data: questions, error } = await tq
    .from('questions')
    .select('points')
    .eq('quiz_id', quizId);
  if (error || !questions) return 0;
  return questions.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, q: any) => sum + Number(q.points ?? 0),
    0,
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/quizzes/[id]', request as any);
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: quiz, error } = await tq
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // Use maybeSingle() to return null instead of error when not found

    if (error) {
      log.error('Quiz fetch error', { quizId: id, code: error.code, details: error.details, hint: error.hint }, error);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz) {
      log.warn('Quiz not found (no data returned)', { quizId: id });
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (e: any) {
    log.error('GET handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/quizzes/[id]', request as any);
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const data = await request.json();
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Use service client to fetch existing quiz (bypasses RLS for read)
    const { data: existingQuiz, error: fetchError } = await tq
      .from("quizzes")
      .select("creator_id, course_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingQuiz) {
      log.error('Quiz fetch error in PUT', { quizId: id }, fetchError);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    
    // Check authorization: creator, admin, or course instructor
    const isCreator = existingQuiz.creator_id === user.id;
    const isAdmin = hasRole(user.role, ["admin", "super_admin"]);
    const isCourseInstructor = existingQuiz.course_id ? 
      await checkCourseInstructor(tq, user.id, existingQuiz.course_id) : false;
    
    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: "You don't have permission to edit this quiz" }, { status: 403 });
    }
    
    // Get course_id - prioritize provided course_id, then try to get from lesson, then use existing
    let courseId = data.course_id ?? null;
    
    // If course_id not provided but lesson_id is, try to get course_id from lesson
    if (!courseId && data.lesson_id) {
      const { data: lesson } = await tq
        .from("lessons")
        .select("course_id")
        .eq("id", data.lesson_id)
        .single();
      courseId = lesson?.course_id ?? null;
    }
    
    // If still no course_id, use existing quiz's course_id
    if (!courseId) {
      courseId = existingQuiz.course_id;
    }
    
    const updateData = {
      lesson_id: data.lesson_id ?? null,
      course_id: courseId,
      title: String(data.title || ""),
      description: String(data.description || ""),
      instructions: String(data.instructions || ""),
      time_limit: data.time_limit ?? null,
      attempts_allowed: Number(data.attempts_allowed ?? 1),
      show_correct_answers: Boolean(data.show_correct_answers),
      show_feedback: String(data.show_feedback ?? "after_submit"),
      randomize_questions: Boolean(data.randomize_questions),
      randomize_answers: Boolean(data.randomize_answers),
      passing_score: data.passing_score ?? null,
      due_date: data.due_date ?? null,
      available_from: data.available_from ?? null,
      available_until: data.available_until ?? null,
      points: Number(data.points ?? 0),
      published: Boolean(data.published),
      proctored_mode: ['none', 'basic', 'strict'].includes(data.proctored_mode) ? data.proctored_mode : 'none',
      proctor_settings: data.proctored_mode && data.proctored_mode !== 'none' ? (data.proctor_settings ?? null) : null,
      show_in_curriculum: data.show_in_curriculum !== undefined ? Boolean(data.show_in_curriculum) : undefined,
      curriculum_order: data.curriculum_order ?? undefined,
      updated_at: new Date().toISOString()
    };
    
    // Use service client for update to bypass RLS (we've already verified authorization above)
    const { data: quiz, error } = await tq
      .from("quizzes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      log.error('Quiz update error', { quizId: id }, error);
      return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
    }

    if (!quiz) {
      log.error('Quiz update returned no data', { quizId: id });
      return NextResponse.json({ error: "Failed to update quiz - no data returned" }, { status: 500 });
    }

        // Sync with the gradebook in-process. The previous server-to-server
        // fetch silently 401'd because it carried no session, so points
        // and title changes never reached the gradebook — call the service
        // directly instead.
        if (quiz.course_id) {
          try {
            const calculated = await calculateQuizTotalPoints(tq, id);
            const points = calculated > 0 ? calculated : Number(quiz.points ?? 0) || 100;
            await updateAssessmentInGradebook(tq, {
              courseId: quiz.course_id,
              assessmentId: id,
              type: 'quiz',
              title: quiz.title,
              dueDate: quiz.due_date ?? null,
              points,
            });
          } catch (syncError) {
            log.error('Gradebook sync error', { quizId: id, courseId: quiz.course_id }, syncError);
            // Don't fail the quiz update if sync fails.
          }
        }

        return NextResponse.json(quiz);
  } catch (e: any) {
    log.error('PUT handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(supabase: any, userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .maybeSingle();

  if (error) {
    // Standalone logger — this helper is called from multiple handlers
    // and isn't aware of the request context. Errors here are rare.
    logger.error('Error checking course instructor', { source: 'api/quizzes/[id]', userId, courseId }, error);
    return false;
  }

  return !!data;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = createLogger('api/quizzes/[id]', request as any);
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) return createAuthResponse("Forbidden", 403);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get quiz data before deletion for gradebook cleanup and lesson content cleanup
    const { data: quizToDelete, error: fetchError } = await tq
      .from("quizzes")
      .select("id, course_id, lesson_id, creator_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      log.error('Error fetching quiz', { quizId: id }, fetchError);
      return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
    }

    if (!quizToDelete) {
      log.warn('Quiz not found', { quizId: id });
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check authorization: only creator or admin can delete
    const isCreator = quizToDelete.creator_id === user.id;
    const isAdmin = hasRole(user.role, ["admin", "super_admin"]);
    const isCourseInstructor = quizToDelete.course_id ?
      await checkCourseInstructor(tq, user.id, quizToDelete.course_id) : false;

    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({
        error: "You don't have permission to delete this quiz"
      }, { status: 403 });
    }

    // Explicitly delete related records first (in case CASCADE isn't working)
    // Delete quiz attempts
    const { error: attemptsError } = await tq
      .from("quiz_attempts")
      .delete()
      .eq("quiz_id", id);

    if (attemptsError) {
      log.error('Error deleting quiz attempts', { quizId: id }, attemptsError);
      // Continue anyway - the CASCADE should handle this
    }

    // Delete questions
    const { error: questionsError } = await tq
      .from("questions")
      .delete()
      .eq("quiz_id", id);

    if (questionsError) {
      log.error('Error deleting questions', { quizId: id }, questionsError);
      // Continue anyway - the CASCADE should handle this
    }

    // Delete the quiz
    const { error } = await tq
      .from("quizzes")
      .delete()
      .eq("id", id);

    if (error) {
      log.error('Quiz delete error', { quizId: id }, error);
      return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
    }

    // Verify deletion by trying to fetch the quiz
    const { data: verifyQuiz } = await tq
      .from("quizzes")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (verifyQuiz) {
      log.error('Quiz still exists after deletion attempt', { quizId: id });
      return NextResponse.json({
        error: "Quiz deletion may have failed. Please verify the quiz was deleted.",
        warning: "Quiz still exists in database"
      }, { status: 500 });
    }

    // Clean up gradebook items and student grades associated with this quiz
    try {
      // First, find the grade_item_id(s) associated with this quiz
      const { data: gradeItems, error: gradeItemsFetchError } = await tq
        .from("course_grade_items")
        .select("id")
        .eq("type", "quiz")
        .eq("assessment_id", id);

      if (gradeItemsFetchError) {
        log.error('Error fetching grade items', { quizId: id }, gradeItemsFetchError);
      } else if (gradeItems && gradeItems.length > 0) {
        const gradeItemIds = gradeItems.map(item => item.id);

        // Delete all student grades (scores) associated with these grade items
        const { error: gradesDeleteError } = await tq
          .from("course_grades")
          .delete()
          .in("grade_item_id", gradeItemIds);

        if (gradesDeleteError) {
          log.error('Error deleting student grades', { quizId: id, gradeItemIds }, gradesDeleteError);
        }

        // Now delete the grade items themselves (not just mark as inactive)
        const { error: gradeItemsDeleteError } = await tq
          .from("course_grade_items")
          .delete()
          .in("id", gradeItemIds);

        if (gradeItemsDeleteError) {
          log.error('Error deleting grade items', { quizId: id, gradeItemIds }, gradeItemsDeleteError);
          // Fallback: mark as inactive if delete fails
          const { error: gradebookUpdateError } = await tq
            .from("course_grade_items")
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .in("id", gradeItemIds);

          if (gradebookUpdateError) {
            log.error('Fallback gradebook update also failed', { quizId: id }, gradebookUpdateError);
          }
        }
      }
    } catch (cleanupError) {
      log.error('Error during gradebook cleanup', { quizId: id }, cleanupError);
      // Don't fail the deletion - quiz is already deleted
    }

    // Remove quiz reference from lesson content array
    try {
      if (quizToDelete?.lesson_id) {
        // Fetch the lesson's content
        const { data: lesson } = await tq
          .from("lessons")
          .select("content")
          .eq("id", quizToDelete.lesson_id)
          .single();

        if (lesson?.content && Array.isArray(lesson.content)) {
          // Filter out the quiz reference from the content array
          const updatedContent = lesson.content.filter((item: any) => {
            // Remove items where type is 'quiz' and the quizId matches
            if (item?.type === 'quiz' && item?.data?.quizId === id) {
              return false;
            }
            return true;
          });

          // Only update if we actually removed something
          if (updatedContent.length !== lesson.content.length) {
            const { error: lessonUpdateError } = await tq
              .from("lessons")
              .update({
                content: updatedContent,
                updated_at: new Date().toISOString()
              })
              .eq("id", quizToDelete.lesson_id);

            if (lessonUpdateError) {
              log.error('Lesson content cleanup error', { quizId: id, lessonId: quizToDelete.lesson_id }, lessonUpdateError);
            }
          }
        }
      }
    } catch (lessonCleanupError) {
      log.error('Error during lesson content cleanup', { quizId: id }, lessonCleanupError);
      // Don't fail the deletion - quiz is already deleted
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    log.error('DELETE handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
