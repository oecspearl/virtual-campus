import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Use service client for GET requests to bypass RLS and ensure students can access questions
    const supabase = createServiceSupabaseClient();
    
    const { data: questions, error } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", id)
      .order("order", { ascending: true })
      .limit(200);
    
    if (error) {
      console.error('Questions fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
    
    return NextResponse.json({ questions: questions || [] });
  } catch (e: any) {
    console.error('Questions GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const data = await request.json();
    const serviceSupabase = createServiceSupabaseClient();
    
    // Verify user can edit this quiz
    const { data: quiz, error: quizError } = await serviceSupabase
      .from("quizzes")
      .select("creator_id, course_id")
      .eq("id", id)
      .single();
    
    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    
    // Check authorization: creator, admin, or course instructor
    const isCreator = quiz.creator_id === user.id;
    const isAdmin = hasRole(user.role, ["admin", "super_admin"]);
    const isCourseInstructor = quiz.course_id ? 
      await checkCourseInstructor(serviceSupabase, user.id, quiz.course_id) : false;
    
    if (!isCreator && !isAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: "You don't have permission to edit this quiz" }, { status: 403 });
    }
    
    const payload = {
      quiz_id: id,
      type: String(data.type || "multiple_choice"),
      question_text: String(data.question_text || ""),
      points: Number(data.points ?? 1),
      order: Number(data.order ?? 0),
      options: data.options ?? null,
      correct_answer: data.correct_answer ?? null,
      case_sensitive: Boolean(data.case_sensitive),
      feedback_correct: data.feedback_correct ?? null,
      feedback_incorrect: data.feedback_incorrect ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Use service client to bypass RLS (we've already verified authorization)
    const { data: question, error } = await serviceSupabase
      .from("questions")
      .insert([payload])
      .select()
      .single();
    
    if (error) {
      console.error('Question creation error:', error);
      return NextResponse.json({ error: "Failed to create question", details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ id: question.id });
  } catch (e: any) {
    console.error('Question POST API error:', e);
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
