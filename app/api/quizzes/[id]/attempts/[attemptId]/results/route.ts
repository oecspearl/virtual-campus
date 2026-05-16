import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createLogger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const log = createLogger('api/quizzes/[id]/attempts/[attemptId]/results', _request as any);
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(_request as any);
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
      log.warn('Quiz attempt not found for results', { attemptId });
      return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
    }
    
    // Check permissions
    const canView = attempt.student_id === user.id || hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .single();
    
    if (quizError) {
      log.warn('Quiz fetch failed (returning null)', { quizId: id }, );
      // Don't fail if quiz not found, just return null
    }

    return NextResponse.json({ attempt, quiz: quiz || null });
  } catch (e: any) {
    log.error('GET handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
