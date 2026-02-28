import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const studentId = url.searchParams.get('studentId');
    
    if (!courseId) {
      return NextResponse.json({ error: "courseId parameter is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get course information
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, description")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, status, enrolled_at")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: "User not enrolled in course" }, { status: 403 });
    }

    // Get activated grade items for this course
    const { data: gradeItems, error: itemsError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // Get student's grades for these items
    const targetStudentId = studentId || user.id;
    const { data: grades, error: gradesError } = await supabase
      .from("course_grades")
      .select(`
        *,
        grade_item:course_grade_items(title, type, category, points)
      `)
      .eq("course_id", courseId)
      .eq("student_id", targetStudentId);

    // Get student info
    const { data: studentInfo, error: studentError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", targetStudentId)
      .single();

    return NextResponse.json({
      course,
      student: studentInfo,
      enrollment,
      gradeItems: gradeItems || [],
      grades: grades || [],
      debug: {
        courseId,
        studentId: targetStudentId,
        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment?.status,
        activatedGradeItemsCount: gradeItems?.length || 0,
        studentGradesCount: grades?.length || 0,
        userRole: user.role,
        isAdmin: ['admin', 'super_admin', 'curriculum_designer'].includes(user.role)
      }
    });

  } catch (e: any) {
    console.error('Debug student gradebook API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
