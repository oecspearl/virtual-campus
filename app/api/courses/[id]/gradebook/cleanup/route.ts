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

    // Check if user has instructor/admin access
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const cleanupResults = await performGradebookCleanup(tq, courseId);

    return NextResponse.json({
      success: true,
      message: "Gradebook cleanup completed successfully",
      results: cleanupResults
    });

  } catch (e: any) {
    console.error('Gradebook cleanup API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function performGradebookCleanup(tq: any, courseId: string) {
  const results = {
    orphanedQuizItems: 0,
    orphanedAssignmentItems: 0,
    duplicateItemsRemoved: 0,
    inactiveItemsCreated: 0,
    errors: [] as string[]
  };

  try {
    // 1. Mark grade items as inactive for deleted quizzes
    const { data: orphanedQuizzes, error: quizError } = await tq
      .from("course_grade_items")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("course_id", courseId)
      .eq("type", "quiz")
      .not("assessment_id", "is", null)
      .not("assessment_id", "in", `(SELECT id FROM quizzes WHERE id IS NOT NULL)`)
      .select("id");

    if (quizError) {
      results.errors.push(`Quiz cleanup error: ${quizError.message}`);
    } else {
      results.orphanedQuizItems = orphanedQuizzes?.length || 0;
    }

    // 2. Mark grade items as inactive for deleted assignments
    const { data: orphanedAssignments, error: assignmentError } = await tq
      .from("course_grade_items")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("course_id", courseId)
      .eq("type", "assignment")
      .not("assessment_id", "is", null)
      .not("assessment_id", "in", `(SELECT id FROM assignments WHERE id IS NOT NULL)`)
      .select("id");

    if (assignmentError) {
      results.errors.push(`Assignment cleanup error: ${assignmentError.message}`);
    } else {
      results.orphanedAssignmentItems = orphanedAssignments?.length || 0;
    }

    // 3. Find and remove duplicate grade items (keep most recent)
    const { data: duplicateItems, error: duplicateError } = await tq.raw
      .rpc('find_duplicate_grade_items', { target_course_id: courseId });

    if (duplicateError) {
      results.errors.push(`Duplicate detection error: ${duplicateError.message}`);
    } else if (duplicateItems && duplicateItems.length > 0) {
      // Mark duplicates as inactive
      const duplicateIds = duplicateItems.map((item: any) => item.id);
      const { error: markDuplicateError } = await tq
        .from("course_grade_items")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", duplicateIds);

      if (markDuplicateError) {
        results.errors.push(`Duplicate removal error: ${markDuplicateError.message}`);
      } else {
        results.duplicateItemsRemoved = duplicateItems.length;
      }
    }

    // 4. Count total inactive items
    const { data: inactiveItems, error: inactiveError } = await tq
      .from("course_grade_items")
      .select("id", { count: "exact" })
      .eq("course_id", courseId)
      .eq("is_active", false);

    if (!inactiveError) {
      results.inactiveItemsCreated = inactiveItems?.length || 0;
    }

  } catch (error: any) {
    results.errors.push(`General cleanup error: ${error.message}`);
  }

  return results;
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
