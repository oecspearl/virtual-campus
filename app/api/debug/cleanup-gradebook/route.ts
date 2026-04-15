import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["admin", "super_admin"])) {
      return createAuthResponse("Admin access required", 403);
    }

    const supabase = await createServerSupabaseClient();
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID required" }, { status: 400 });
    }

    // Find orphaned grade items for this course
    const { data: orphanedItems, error: orphanedError } = await supabase
      .from("course_grade_items")
      .select(`
        id,
        title,
        type,
        assessment_id,
        points,
        courses(title)
      `)
      .eq("course_id", courseId);

    if (orphanedError) {
      return NextResponse.json({ error: "Failed to fetch grade items" }, { status: 500 });
    }

    const cleanupResults = [];

    for (const item of orphanedItems || []) {
      let assessmentExists = false;

      if (item.type === 'assignment') {
        const { data: assignment } = await supabase
          .from("assignments")
          .select("id")
          .eq("id", item.assessment_id)
          .single();
        assessmentExists = !!assignment;
      } else if (item.type === 'quiz') {
        const { data: quiz } = await supabase
          .from("quizzes")
          .select("id")
          .eq("id", item.assessment_id)
          .single();
        assessmentExists = !!quiz;
      }

      if (!assessmentExists && item.assessment_id) {
        // Delete associated grades first
        const { error: gradesError } = await supabase
          .from("course_grades")
          .delete()
          .eq("grade_item_id", item.id);

        if (gradesError) {
          cleanupResults.push({
            itemId: item.id,
            title: item.title,
            status: 'error',
            message: `Failed to delete grades: ${gradesError.message}`
          });
          continue;
        }

        // Delete the grade item
        const { error: itemError } = await supabase
          .from("course_grade_items")
          .delete()
          .eq("id", item.id);

        if (itemError) {
          cleanupResults.push({
            itemId: item.id,
            title: item.title,
            status: 'error',
            message: `Failed to delete grade item: ${itemError.message}`
          });
        } else {
          cleanupResults.push({
            itemId: item.id,
            title: item.title,
            status: 'deleted',
            message: 'Successfully removed from gradebook'
          });
        }
      } else {
        cleanupResults.push({
          itemId: item.id,
          title: item.title,
          status: 'exists',
          message: 'Assessment still exists, keeping grade item'
        });
      }
    }

    // Get final count
    const { data: finalItems, error: finalError } = await supabase
      .from("course_grade_items")
      .select("id")
      .eq("course_id", courseId);

    return NextResponse.json({
      success: true,
      courseId,
      totalProcessed: orphanedItems?.length || 0,
      finalItemCount: finalItems?.length || 0,
      results: cleanupResults
    });

  } catch (e: any) {
    console.error('Gradebook cleanup API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
