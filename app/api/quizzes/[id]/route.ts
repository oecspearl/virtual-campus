import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: quiz, error } = await tq
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // Use maybeSingle() to return null instead of error when not found
    
    if (error) {
      console.error('[Quiz GET] Quiz fetch error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        quizId: id
      });
      return NextResponse.json({ 
        error: "Quiz not found",
        details: error.message,
        code: error.code
      }, { status: 404 });
    }
    
    if (!quiz) {
      console.warn('[Quiz GET] Quiz not found (no data returned). Quiz ID:', id);
      return NextResponse.json({ 
        error: "Quiz not found",
        details: `No quiz found with ID: ${id}`
      }, { status: 404 });
    }
    
    console.log('[Quiz GET] Quiz found:', { id: quiz.id, title: quiz.title });
    return NextResponse.json(quiz);
  } catch (e: any) {
    console.error('[Quiz GET] Unexpected error:', {
      message: e.message,
      stack: e.stack,
      error: e,
      name: e.name
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: e.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
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
      console.error('Quiz fetch error in PUT:', fetchError);
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
      proctored_mode: Boolean(data.proctored_mode),
      proctor_settings: data.proctored_mode ? (data.proctor_settings ?? null) : null,
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
      console.error('Quiz update error:', error);
      return NextResponse.json({ 
        error: "Failed to update quiz",
        details: error.message 
      }, { status: 500 });
    }

    if (!quiz) {
      console.error('Quiz update returned no data');
      return NextResponse.json({ error: "Failed to update quiz - no data returned" }, { status: 500 });
    }

        // Sync with gradebook if quiz is associated with a course
        if (quiz.course_id) {
          try {
            const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/courses/${quiz.course_id}/gradebook/quiz-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assessmentId: id,
                assessmentType: 'quiz',
                action: 'updated'
              })
            });
            
            if (!syncResponse.ok) {
              const syncErrorData = await syncResponse.json().catch(() => ({}));
              console.error('Gradebook sync failed:', syncErrorData);
            }
          } catch (syncError) {
            console.error('Gradebook sync error:', syncError);
            // Don't fail the quiz update if sync fails
          }
        }

        return NextResponse.json(quiz);
  } catch (e: any) {
    console.error('Quiz PUT API error:', e);
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
    console.error('Error checking course instructor:', error);
    return false;
  }
  
  return !!data;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get quiz data before deletion for gradebook cleanup and lesson content cleanup
    const { data: quizToDelete, error: fetchError } = await tq
      .from("quizzes")
      .select("id, course_id, lesson_id, creator_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Quiz DELETE] Error fetching quiz:', fetchError);
      return NextResponse.json({
        error: "Failed to fetch quiz",
        details: fetchError.message
      }, { status: 500 });
    }

    if (!quizToDelete) {
      console.warn('[Quiz DELETE] Quiz not found:', id);
      return NextResponse.json({
        error: "Quiz not found",
        details: `No quiz found with ID: ${id}`
      }, { status: 404 });
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

    console.log('[Quiz DELETE] Deleting quiz:', { id, user: user.id, isCreator, isAdmin });

    // Explicitly delete related records first (in case CASCADE isn't working)
    // Delete quiz attempts
    const { error: attemptsError } = await tq
      .from("quiz_attempts")
      .delete()
      .eq("quiz_id", id);

    if (attemptsError) {
      console.error('[Quiz DELETE] Error deleting quiz attempts:', attemptsError);
      // Continue anyway - the CASCADE should handle this
    }

    // Delete questions
    const { error: questionsError } = await tq
      .from("questions")
      .delete()
      .eq("quiz_id", id);

    if (questionsError) {
      console.error('[Quiz DELETE] Error deleting questions:', questionsError);
      // Continue anyway - the CASCADE should handle this
    }

    // Delete the quiz
    const { error } = await tq
      .from("quizzes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('[Quiz DELETE] Quiz delete error:', error);
      return NextResponse.json({
        error: "Failed to delete quiz",
        details: error.message
      }, { status: 500 });
    }

    // Verify deletion by trying to fetch the quiz
    const { data: verifyQuiz } = await tq
      .from("quizzes")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (verifyQuiz) {
      console.error('[Quiz DELETE] Warning: Quiz still exists after deletion attempt:', id);
      return NextResponse.json({ 
        error: "Quiz deletion may have failed. Please verify the quiz was deleted.",
        warning: "Quiz still exists in database"
      }, { status: 500 });
    }

    console.log('[Quiz DELETE] Successfully deleted quiz:', id);

    // Clean up gradebook items and student grades associated with this quiz
    try {
      // First, find the grade_item_id(s) associated with this quiz
      const { data: gradeItems, error: gradeItemsFetchError } = await tq
        .from("course_grade_items")
        .select("id")
        .eq("type", "quiz")
        .eq("assessment_id", id);

      if (gradeItemsFetchError) {
        console.error('[Quiz DELETE] Error fetching grade items:', gradeItemsFetchError);
      } else if (gradeItems && gradeItems.length > 0) {
        const gradeItemIds = gradeItems.map(item => item.id);
        console.log('[Quiz DELETE] Found grade items to clean up:', gradeItemIds);

        // Delete all student grades (scores) associated with these grade items
        const { error: gradesDeleteError, count: deletedGradesCount } = await tq
          .from("course_grades")
          .delete()
          .in("grade_item_id", gradeItemIds);

        if (gradesDeleteError) {
          console.error('[Quiz DELETE] Error deleting student grades:', gradesDeleteError);
        } else {
          console.log('[Quiz DELETE] Successfully deleted student grades for quiz:', id, 'count:', deletedGradesCount);
        }

        // Now delete the grade items themselves (not just mark as inactive)
        const { error: gradeItemsDeleteError } = await tq
          .from("course_grade_items")
          .delete()
          .in("id", gradeItemIds);

        if (gradeItemsDeleteError) {
          console.error('[Quiz DELETE] Error deleting grade items:', gradeItemsDeleteError);
          // Fallback: mark as inactive if delete fails
          const { error: gradebookUpdateError } = await tq
            .from("course_grade_items")
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .in("id", gradeItemIds);

          if (gradebookUpdateError) {
            console.error('[Quiz DELETE] Fallback gradebook update also failed:', gradebookUpdateError);
          }
        } else {
          console.log('[Quiz DELETE] Successfully deleted grade items for quiz:', id);
        }
      } else {
        console.log('[Quiz DELETE] No grade items found for quiz:', id);
      }
    } catch (cleanupError) {
      console.error('[Quiz DELETE] Error during gradebook cleanup:', cleanupError);
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
              console.error('[Quiz DELETE] Lesson content cleanup error:', lessonUpdateError);
            } else {
              console.log('[Quiz DELETE] Successfully removed quiz reference from lesson content:', id);
            }
          }
        }
      }
    } catch (lessonCleanupError) {
      console.error('[Quiz DELETE] Error during lesson content cleanup:', lessonCleanupError);
      // Don't fail the deletion - quiz is already deleted
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[Quiz DELETE] Unexpected error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
