import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await request.json();
    const { assessmentId, assessmentType, action } = data; // action: 'activate' or 'deactivate'

    if (!assessmentId || !assessmentType || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get assessment details (quiz or assignment)
    let assessment, assessmentError;
    if (assessmentType === 'quiz') {
      const result = await tq
        .from("quizzes")
        .select("*")
        .eq("id", assessmentId)
        .single();
      assessment = result.data;
      assessmentError = result.error;
    } else if (assessmentType === 'assignment') {
      const result = await tq
        .from("assignments")
        .select("*")
        .eq("id", assessmentId)
        .single();
      assessment = result.data;
      assessmentError = result.error;
    } else {
      return NextResponse.json({ error: "Invalid assessment type" }, { status: 400 });
    }

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: `${assessmentType} not found` }, { status: 404 });
    }

    if (action === 'activate') {
      // Check if already activated
      const { data: existingItem } = await tq
        .from("course_grade_items")
        .select("id")
        .eq("course_id", courseId)
        .eq("assessment_id", assessmentId)
        .eq("type", assessmentType)
        .single();

      if (existingItem) {
        return NextResponse.json({ error: `${assessmentType} is already activated` }, { status: 400 });
      }

      // Create grade item for the assessment
      const { data: gradeItem, error: itemError } = await tq
        .from("course_grade_items")
        .insert([{
          course_id: courseId,
          title: assessment.title,
          type: assessmentType,
          category: assessmentType === 'quiz' ? 'Quizzes' : 'Assignments',
          points: assessment.points || 100,
          assessment_id: assessmentId,
          due_date: assessment.due_date,
          weight: 1.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (itemError) {
        console.error('Grade item creation error:', itemError);
        return NextResponse.json({ error: `Failed to activate ${assessmentType}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${assessmentType} activated successfully`,
        gradeItem
      });

    } else if (action === 'deactivate') {
      // Remove grade item for the assessment
      const { error: deleteError } = await tq
        .from("course_grade_items")
        .delete()
        .eq("course_id", courseId)
        .eq("assessment_id", assessmentId)
        .eq("type", assessmentType);

      if (deleteError) {
        console.error('Grade item deletion error:', deleteError);
        return NextResponse.json({ error: `Failed to deactivate ${assessmentType}` }, { status: 500 });
      }

      // Also remove any existing grades for this assessment
      await tq
        .from("course_grades")
        .delete()
        .eq("course_id", courseId)
        .in("grade_item_id",
          await tq
            .from("course_grade_items")
            .select("id")
            .eq("course_id", courseId)
            .eq("assessment_id", assessmentId)
            .eq("type", assessmentType)
            .then(res => res.data?.map(item => item.id) || [])
        );

      return NextResponse.json({
        success: true,
        message: `${assessmentType} deactivated successfully`
      });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (e: any) {
    console.error('Quiz activation API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check if user is instructor for a course
async function checkCourseInstructor(tq: any, userId: string, courseId: string): Promise<boolean> {
  const { data } = await tq
    .from("course_instructors")
    .select("id")
    .eq("course_id", courseId)
    .eq("instructor_id", userId)
    .single();

  return !!data;
}
