import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { generateAdaptiveRecommendations, updateCompetenciesFromQuiz } from "@/lib/adaptive-learning";
import { getStudentExtension, resolveEffectiveSettings } from "@/lib/quiz-extensions";
import { syncCrossTenantGrade } from "@/lib/enrollment-check";

// Helper function to calculate quiz total points from questions
async function calculateQuizTotalPoints(supabase: any, quizId: string): Promise<number> {
  const { data: questions, error } = await supabase
    .from("questions")
    .select("points")
    .eq("quiz_id", quizId);
  
  if (error || !questions) {
    console.error('Failed to fetch questions for quiz points calculation:', error);
    return 0;
  }
  
  // Sum all question points
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points ?? 0), 0);
  return totalPoints;
}

// Helper function to sync quiz grades to gradebook
async function syncQuizToGradebook(supabase: any, quizId: string, courseId: string, studentId: string) {
  // First, check if grade item exists for this quiz
  let { data: gradeItem, error: itemError } = await supabase
    .from("course_grade_items")
    .select("*")
    .eq("course_id", courseId)
    .eq("type", "quiz")
    .eq("assessment_id", quizId)
    .single();

  // If no grade item exists, create one automatically
  if (itemError || !gradeItem) {
    console.log('No grade item found for quiz, creating one:', quizId);
    
    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      console.error('Failed to fetch quiz details:', quizError);
      return;
    }

    // Calculate actual total points from questions (not from quiz.points field)
    const totalPoints = await calculateQuizTotalPoints(supabase, quizId);
    const pointsToUse = totalPoints > 0 ? totalPoints : (quiz.points || 100);

    // Create grade item for the quiz
    const { data: newGradeItem, error: createError } = await supabase
      .from("course_grade_items")
      .insert([{
        course_id: courseId,
        title: quiz.title,
        type: "quiz",
        category: "Quizzes",
        points: pointsToUse,
        assessment_id: quizId,
        due_date: quiz.due_date,
        weight: 1.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError || !newGradeItem) {
      console.error('Failed to create grade item:', createError);
      return;
    }

    gradeItem = newGradeItem;
  } else {
    // Update existing grade item if points don't match calculated total
    const totalPoints = await calculateQuizTotalPoints(supabase, quizId);
    const currentPoints = Number(gradeItem.points || 0);
    
    if (totalPoints > 0 && currentPoints !== totalPoints) {
      console.log(`Updating grade item points from ${currentPoints} to ${totalPoints} for quiz ${quizId}`);
      const { error: updateError } = await supabase
        .from("course_grade_items")
        .update({ points: totalPoints, updated_at: new Date().toISOString() })
        .eq("id", gradeItem.id);
      
      if (!updateError) {
        gradeItem.points = totalPoints;
        
        // Update all existing grades for this grade item with new max_score and recalculated percentage
        const { data: existingGrades, error: gradesError } = await supabase
          .from("course_grades")
          .select("id, score")
          .eq("grade_item_id", gradeItem.id);
        
        if (!gradesError && existingGrades && existingGrades.length > 0) {
          const gradeUpdates = existingGrades.map((grade: any) => {
            const newPercentage = totalPoints > 0 ? (Number(grade.score) / totalPoints) * 100 : 0;
            return {
              id: grade.id,
              max_score: totalPoints,
              percentage: Number(newPercentage.toFixed(2)),
              updated_at: new Date().toISOString()
            };
          });
          
          // Update all grades in batch
          for (const update of gradeUpdates) {
            await supabase
              .from("course_grades")
              .update({
                max_score: update.max_score,
                percentage: update.percentage,
                updated_at: update.updated_at
              })
              .eq("id", update.id);
          }
          
          console.log(`Updated ${gradeUpdates.length} existing grades with new max_score ${totalPoints}`);
        }
      }
    }
  }

  // Get the BEST attempt for this specific student and quiz (highest percentage, then most recent)
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .eq("status", "graded")
    .order("percentage", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (attemptError || !attempt) {
    console.log('No graded attempt found for quiz:', quizId);
    return;
  }

  // Check if grade already exists
  const { data: existingGrade } = await supabase
    .from("course_grades")
    .select("id")
    .eq("course_id", courseId)
    .eq("student_id", attempt.student_id)
    .eq("grade_item_id", gradeItem.id)
    .single();

  const percentage = gradeItem.points > 0 ? (attempt.score / gradeItem.points) * 100 : 0;
  
  if (existingGrade) {
    // Update existing grade
    await supabase
      .from("course_grades")
      .update({
        score: attempt.score,
        max_score: gradeItem.points,
        percentage: Number(percentage.toFixed(2)),
        updated_at: new Date().toISOString()
      })
      .eq("id", existingGrade.id);
  } else {
    // Create new grade
    await supabase
      .from("course_grades")
      .insert([{
        course_id: courseId,
        student_id: attempt.student_id,
        grade_item_id: gradeItem.id,
        score: attempt.score,
        max_score: gradeItem.points,
        percentage: Number(percentage.toFixed(2)),
        graded_at: attempt.submitted_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function grade(quiz: any, questions: any[], attemptAnswers: { question_id: string; answer: unknown }[]) {
  let score = 0;
  let max = 0;
  const gradedAnswers: { question_id: string; answer: unknown; correct: boolean; points_earned: number; feedback?: string }[] = [];

  const qmap = new Map<string, any>(questions.map((q) => [q.id, q]));
  for (const q of questions) {
    max += Number(q.points ?? 0);
  }

  for (const ans of attemptAnswers) {
    const q = qmap.get(ans.question_id);
    if (!q) continue;
    const type = q.type as string;
    const pts = Number(q.points ?? 0);
    let correct = false;
    let earned = 0;

    if (type === "true_false" || type === "multiple_choice") {
      // options with is_correct; support multiple correct for partial credit
      const correctOptions = (q.options ?? []).filter((o: { is_correct: boolean }) => o.is_correct);
      const correctIds = new Set(correctOptions.map((o: { id: string }) => o.id));
      if (Array.isArray(ans.answer)) {
        const picked = new Set((ans.answer as string[]));
        const totalCorrect = correctIds.size;
        const correctlyPicked = Array.from(picked).filter((id) => correctIds.has(id)).length;
        const incorrectlyPicked = Array.from(picked).filter((id) => !correctIds.has(id)).length;
        const ratio = Math.max(0, (correctlyPicked - incorrectlyPicked) / Math.max(1, totalCorrect));
        earned = Math.round(ratio * pts);
        correct = earned === pts;
      } else {
        const isRight = correctIds.has(String(ans.answer));
        earned = isRight ? pts : 0;
        correct = isRight;
      }
    } else if (type === "short_answer") {
      const expected = q.correct_answer;
      if (Array.isArray(expected)) {
        const normalized = String(ans.answer ?? "").trim();
        const matched = expected.some((exp: string) => {
          return (q.case_sensitive ? normalized : normalized.toLowerCase()) === (q.case_sensitive ? exp : exp.toLowerCase());
        });
        earned = matched ? pts : 0;
        correct = matched;
      } else if (typeof expected === "string") {
        const normalized = String(ans.answer ?? "").trim();
        const matched = (q.case_sensitive ? normalized : normalized.toLowerCase()) === (q.case_sensitive ? expected : (expected as string).toLowerCase());
        earned = matched ? pts : 0;
        correct = matched;
      }
    } else if (type === "essay" || type === "fill_blank" || type === "matching") {
      // manual grading required
      earned = 0;
      correct = false;
    }

    const feedback = correct ? (q.feedback_correct ?? undefined) : (q.feedback_incorrect ?? undefined);
    gradedAnswers.push({ question_id: ans.question_id, answer: ans.answer, correct, points_earned: earned, feedback });
    score += earned;
  }
  const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
  return { score, max, percentage, gradedAnswers };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    
    // Use service client to bypass RLS for all database reads
    const supabase = createServiceSupabaseClient();
    
    // Get attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();
    
    if (attemptError || !attempt) {
      console.error('Quiz attempt fetch error:', attemptError);
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    
    if (attempt.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .single();
    
    if (quizError || !quiz) {
      console.error('Quiz fetch error:', quizError);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Resolve effective settings for this student (extension-aware)
    const _extension = await getStudentExtension(id, attempt.student_id);
    const _effective = resolveEffectiveSettings(quiz, _extension);
    // Note: We don't block submission — student started within the window.
    // _effective is available for future late-submission flagging.

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", id)
      .order("order", { ascending: true })
      .limit(300);
    
    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = (body.answers as any[]) ?? attempt.answers ?? [];

    const { score, max, percentage, gradedAnswers } = grade(quiz, questions || [], answers);

    const now = new Date();
    const started = new Date(attempt.started_at ?? now.toISOString());
    const timeTaken = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000));

    // Determine status: if there are essay-like questions answered, status=submitted else graded
    const hasManual = (questions || []).some((q) => ["essay", "fill_blank", "matching"].includes(q.type));

    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({
        submitted_at: now.toISOString(),
        score,
        max_score: max,
        percentage,
        answers: gradedAnswers,
        time_taken: timeTaken,
        status: hasManual ? "submitted" : "graded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    if (updateError) {
      console.error('Quiz attempt update error:', updateError);
      return NextResponse.json({ error: "Failed to submit quiz attempt" }, { status: 500 });
    }

    // Automatically sync to gradebook if quiz is graded (not manual grading required)
    if (!hasManual) {
      try {
        await syncQuizToGradebook(supabase, id, attempt.course_id, user.id);
      } catch (syncError) {
        console.error('Gradebook sync error:', syncError);
      }

      // Also sync to cross_tenant_grades if student is from another tenant
      if (attempt.course_id) {
        try {
          await syncCrossTenantGrade({
            studentId: user.id,
            courseId: attempt.course_id,
            assessmentType: 'quiz',
            assessmentId: id,
            score,
            maxScore: max,
            percentage,
          });
        } catch (crossSyncError) {
          console.error('Cross-tenant grade sync error:', crossSyncError);
        }
      }
    }

    // Generate adaptive learning recommendations based on quiz performance
    try {
      const recResult = await generateAdaptiveRecommendations(attemptId, user.id);
      if (recResult.count > 0) {
        console.log(`Generated ${recResult.count} adaptive recommendations for attempt ${attemptId}`);
      }
    } catch (recError) {
      console.error('Adaptive recommendations error:', recError);
      // Don't fail quiz submission if recommendations fail
    }

    // Update student competencies based on quiz performance
    try {
      const compResult = await updateCompetenciesFromQuiz(id, user.id, percentage);
      if (compResult.updated > 0) {
        console.log(`Updated ${compResult.updated} competencies for student ${user.id}`);
      }
    } catch (compError) {
      console.error('Competency update error:', compError);
      // Don't fail quiz submission if competency update fails
    }

    return NextResponse.json({ score, max_score: max, percentage, status: hasManual ? "submitted" : "graded" });
  } catch (e: any) {
    console.error('Quiz submit API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
