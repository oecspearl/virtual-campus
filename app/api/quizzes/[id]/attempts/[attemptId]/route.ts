import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(_request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();
    
    if (error || !attempt) {
      console.error('Quiz attempt fetch error:', error);
      return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
    }
    
    // Check if user can view this attempt (student or grader)
    const isGrader = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"]);
    if (attempt.student_id !== user.id && !isGrader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(attempt);
  } catch (e: any) {
    console.error('Quiz attempt GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  try {
    const { id, attemptId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const supabase = await createServerSupabaseClient();

    // Get current attempt
    const { data: currentAttempt, error: fetchError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();
    
    if (fetchError || !currentAttempt) {
      console.error('Quiz attempt fetch error:', fetchError);
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
      console.error('Quiz attempt update error:', updateError);
      return NextResponse.json({ error: "Failed to update quiz attempt" }, { status: 500 });
    }
    
    return NextResponse.json(attempt);
  } catch (e: any) {
    console.error('Quiz attempt PUT API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
