import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createLogger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const log = createLogger('api/quizzes/[id]/attempts/[attemptId]', _request as any);
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(_request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();

    // Full attempt detail — the answers JSONB IS the intended payload
    // (the review/grading UI renders each question's response). The only
    // safe drop is tenant_id (RLS internal, never expose to clients).
    const ATTEMPT_DETAIL_COLUMNS =
      "id, quiz_id, student_id, course_id, attempt_number, started_at, submitted_at, score, max_score, percentage, time_taken, status, answers, created_at, updated_at";
    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .select(ATTEMPT_DETAIL_COLUMNS)
      .eq("id", attemptId)
      .single();
    
    if (error || !attempt) {
      log.warn('Quiz attempt not found', { attemptId });
      return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
    }

    // Check if user can view this attempt (student or grader)
    const isGrader = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);
    if (attempt.student_id !== user.id && !isGrader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(attempt);
  } catch (e: any) {
    log.error('GET handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const log = createLogger('api/quizzes/[id]/attempts/[attemptId]', request as any);
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();

    // Get current attempt — only need student_id + status to check
    // permissions; the response shape on PUT returns the updated row.
    const { data: currentAttempt, error: fetchError } = await supabase
      .from("quiz_attempts")
      .select("id, student_id, status")
      .eq("id", attemptId)
      .single();
    
    if (fetchError || !currentAttempt) {
      log.warn('Quiz attempt not found for update', { attemptId });
      return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
    }
    
    // Check permissions
    const isGrader = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);
    if (currentAttempt.student_id !== user.id && !isGrader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist allowed fields based on role to prevent grade manipulation
    const isGraderUpdate = isGrader && currentAttempt.student_id !== user.id;
    const allowedFields = isGraderUpdate
      ? ['score', 'grade', 'feedback', 'graded_by', 'graded_at', 'status']
      : ['answers', 'status'];

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    
    const { data: attempt, error: updateError } = await supabase
      .from("quiz_attempts")
      .update(updateData)
      .eq("id", attemptId)
      .select()
      .single();
    
    if (updateError) {
      log.error('Quiz attempt update failed', { attemptId }, updateError);
      return NextResponse.json({ error: "Failed to update quiz attempt" }, { status: 500 });
    }

    return NextResponse.json(attempt);
  } catch (e: any) {
    log.error('PUT handler crashed', undefined, e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
