import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { getStudentExtension, resolveEffectiveSettings } from "@/lib/quiz-extensions";
import { createLogger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createLogger('api/quizzes/[id]/extensions/student', request as any);
  try {
    const { id: quizId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");

    // Students can only query their own settings; instructors/admins can query any student
    let studentId = authResult.user.id;
    if (requestedStudentId && requestedStudentId !== authResult.user.id) {
      if (!hasRole(authResult.userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
        return NextResponse.json({ error: "Cannot query other students' extensions" }, { status: 403 });
      }
      studentId = requestedStudentId;
    }

    const supabase = createServiceSupabaseClient();

    // Fetch quiz settings
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("due_date, available_from, available_until, time_limit, attempts_allowed")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Fetch student extension
    const extension = await getStudentExtension(quizId, studentId);

    // Resolve effective settings
    const effective = resolveEffectiveSettings(quiz, extension);

    return NextResponse.json({ effective });
  } catch (e: any) {
    log.error('GET handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
