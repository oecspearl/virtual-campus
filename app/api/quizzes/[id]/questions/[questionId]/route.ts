import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { id, questionId } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const data = await request.json();
    const serviceSupabase = createServiceSupabaseClient();
    
    // Use service client to check if user can edit this quiz (bypasses RLS)
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
    
    // Prepare update data - exclude quiz_id, id, and created_at as they shouldn't be changed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { quiz_id: _quiz_id, id: _id, created_at: _created_at, ...rest } = data as any;
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Only include fields that are provided and should be updated
    if (rest.order !== undefined) updateData.order = Number(rest.order);
    if (rest.points !== undefined) updateData.points = Number(rest.points);
    if (rest.type !== undefined) updateData.type = String(rest.type);
    if (rest.question_text !== undefined) updateData.question_text = String(rest.question_text);
    if (rest.options !== undefined) updateData.options = rest.options;
    if (rest.correct_answer !== undefined) updateData.correct_answer = rest.correct_answer;
    if (rest.case_sensitive !== undefined) updateData.case_sensitive = Boolean(rest.case_sensitive);
    if (rest.feedback_correct !== undefined) updateData.feedback_correct = rest.feedback_correct;
    if (rest.feedback_incorrect !== undefined) updateData.feedback_incorrect = rest.feedback_incorrect;
    
    // Use service client for update to bypass RLS (we've already verified authorization)
    const { data: question, error } = await serviceSupabase
      .from("questions")
      .update(updateData)
      .eq("id", questionId)
      .eq("quiz_id", id) // Ensure question belongs to this quiz
      .select()
      .single();
    
    if (error) {
      console.error('Question update error:', error);
      return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
    
    return NextResponse.json(question);
  } catch (e: any) {
    console.error('Question PUT API error:', e);
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { id, questionId } = await params;
    const user = await getCurrentUser();
    if (!user || !hasRole(user.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const serviceSupabase = createServiceSupabaseClient();
    
    // Use service client to check if user can edit this quiz (bypasses RLS)
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
    
    // Use service client for delete to bypass RLS (we've already verified authorization)
    const { error } = await serviceSupabase
      .from("questions")
      .delete()
      .eq("id", questionId);
    
    if (error) {
      console.error('Question delete error:', error);
      return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Question DELETE API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
