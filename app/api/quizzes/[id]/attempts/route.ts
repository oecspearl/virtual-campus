import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { getStudentExtension, resolveEffectiveSettings } from "@/lib/quiz-extensions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");
    // Only instructors/admins can view other students' attempts
    const isStaff = hasRole(user.role, ['instructor', 'curriculum_designer', 'admin', 'super_admin']);
    let studentId: string | null = user.id;
    const allStudents = requestedStudentId === "*";

    if (requestedStudentId && requestedStudentId !== user.id) {
      if (!isStaff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      studentId = allStudents ? null : requestedStudentId;
    }
    // Use service client for GET requests to bypass RLS and ensure students can access their attempts
    const supabase = createServiceSupabaseClient();

    // When fetching all students (instructor view), join users table for name/email
    const selectFields = allStudents
      ? "*, student:users!quiz_attempts_student_id_fkey(id, name, email)"
      : "*";

    let query = supabase
      .from("quiz_attempts")
      .select(selectFields)
      .eq("quiz_id", id)
      .order("created_at", { ascending: false })
      .limit(200);

    // When studentId=*, fetch all attempts (instructor view); otherwise filter to specific student
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data: attempts, error } = await query;
    
    if (error) {
      console.error('Quiz attempts fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
    }
    
    return NextResponse.json({ attempts: attempts || [] });
  } catch (e: any) {
    console.error('Quiz attempts GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(_request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    
    // Use service client to fetch quiz (bypasses RLS to ensure students can access quizzes)
    const supabase = createServiceSupabaseClient();
    
    // Get quiz details with course information
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(`
        *,
        lesson:lessons(
          course_id
        )
      `)
      .eq("id", id)
      .single();
    
    if (quizError || !quiz) {
      console.error('Quiz fetch error:', quizError);
      console.error('Quiz ID:', id);
      console.error('Quiz data:', quiz);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Get course_id from various sources
    let courseId = null;
    
    console.log('Quiz data:', {
      id: quiz.id,
      title: quiz.title,
      lesson_id: quiz.lesson_id,
      course_id: quiz.course_id,
      lesson: quiz.lesson
    });
    
    // First try direct course_id on quiz (if column exists)
    if (quiz.course_id) {
      courseId = quiz.course_id;
      console.log('Using direct course_id:', courseId);
    }
    // Then try through lesson -> course
    else if (quiz.lesson?.course_id) {
      courseId = quiz.lesson.course_id;
      console.log('Using lesson course_id:', courseId);
    }
    
    if (!courseId) {
      console.error('Quiz not associated with a course. Quiz ID:', id, 'Lesson ID:', quiz.lesson_id);
      console.error('Quiz data:', quiz);
      return NextResponse.json({ 
        error: "Quiz not associated with a course. Please ensure the quiz is linked to a lesson that belongs to a course." 
      }, { status: 400 });
    }

    // Resolve effective settings (handles per-student extensions)
    const extension = await getStudentExtension(id, user.id);
    const effective = resolveEffectiveSettings(quiz, extension);

    // Check availability window
    const now = new Date();

    if (effective.available_from) {
      const availableFrom = new Date(effective.available_from);
      if (now < availableFrom) {
        return NextResponse.json({
          error: `Quiz is not available yet. It opens on ${availableFrom.toLocaleString()}.`,
          available_from: effective.available_from
        }, { status: 400 });
      }
    }

    if (effective.available_until) {
      const availableUntil = new Date(effective.available_until);
      if (now > availableUntil) {
        return NextResponse.json({
          error: `Quiz is no longer available. It closed on ${availableUntil.toLocaleString()}.`,
          available_until: effective.available_until
        }, { status: 400 });
      }
    }

    // Check existing attempts
    const { data: existingAttempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", id)
      .eq("student_id", user.id);

    if (attemptsError) {
      console.error('Existing attempts fetch error:', attemptsError);
      return NextResponse.json({ error: "Failed to check existing attempts" }, { status: 500 });
    }

    const attemptsAllowed = effective.attempts_allowed;

    if ((existingAttempts?.length ?? 0) >= attemptsAllowed) {
      return NextResponse.json({ error: "No attempts left" }, { status: 400 });
    }

    // Create quiz attempt with course_id
    const payload = {
      quiz_id: id,
      course_id: courseId,
      student_id: user.id,
      attempt_number: (existingAttempts?.length ?? 0) + 1,
      started_at: new Date().toISOString(),
      submitted_at: null,
      score: 0,
      max_score: 0,
      percentage: null,
      answers: [] as { question_id: string; answer: unknown; correct: boolean; points_earned: number; feedback?: string }[],
      time_taken: 0,
      status: "in_progress" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: attempt, error: createError } = await supabase
      .from("quiz_attempts")
      .insert([payload])
      .select()
      .single();
    
    if (createError) {
      console.error('Quiz attempt creation error:', createError);
      console.error('Payload that failed:', payload);
      return NextResponse.json({ error: "Failed to create quiz attempt" }, { status: 500 });
    }
    
    return NextResponse.json({ id: attempt.id });
  } catch (e: any) {
    console.error('Quiz attempt POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}