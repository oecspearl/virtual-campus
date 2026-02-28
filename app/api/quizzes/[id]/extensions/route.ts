import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!hasRole(authResult.userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supabase = createServiceSupabaseClient();

    // Fetch extensions with student info
    const { data: extensions, error } = await supabase
      .from("quiz_extensions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quiz extensions:", error);
      return NextResponse.json({ error: "Failed to fetch extensions" }, { status: 500 });
    }

    // Enrich with student names/emails
    const studentIds = (extensions || []).map(e => e.student_id);
    let studentsMap: Record<string, { name: string; email: string }> = {};

    if (studentIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", studentIds);

      if (users) {
        studentsMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, email: u.email }]));
      }
    }

    const enriched = (extensions || []).map(ext => ({
      ...ext,
      student_name: studentsMap[ext.student_id]?.name || "Unknown",
      student_email: studentsMap[ext.student_id]?.email || "",
    }));

    return NextResponse.json({ extensions: enriched });
  } catch (e: any) {
    console.error("Quiz extensions GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!hasRole(authResult.userProfile.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, extended_due_date, extended_available_until, extra_time_minutes, extra_attempts, reason } = body;

    if (!student_id) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Fetch quiz to get course_id
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, course_id")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify student is enrolled in the course
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", quiz.course_id)
      .eq("student_id", student_id)
      .eq("status", "active")
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: "Student is not enrolled in this course" }, { status: 400 });
    }

    // Upsert extension (one per student per quiz)
    const extensionData = {
      quiz_id: quizId,
      student_id,
      course_id: quiz.course_id,
      extended_due_date: extended_due_date || null,
      extended_available_until: extended_available_until || null,
      extra_time_minutes: extra_time_minutes != null ? Number(extra_time_minutes) : null,
      extra_attempts: extra_attempts != null ? Number(extra_attempts) : null,
      reason: reason || null,
      granted_by: authResult.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: extension, error: upsertError } = await supabase
      .from("quiz_extensions")
      .upsert(extensionData, { onConflict: "quiz_id,student_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting quiz extension:", upsertError);
      return NextResponse.json({ error: "Failed to save extension" }, { status: 500 });
    }

    return NextResponse.json({ extension });
  } catch (e: any) {
    console.error("Quiz extensions POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
