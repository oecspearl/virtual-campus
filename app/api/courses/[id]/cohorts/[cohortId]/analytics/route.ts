import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/cohorts/[cohortId]/analytics
 * Get aggregate analytics for a cohort
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  try {
    const { id: courseId, cohortId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "tenant_admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Get cohort info
    const { data: cohort, error: cohortError } = await tq
      .from("classes")
      .select("id, name, start_date, end_date, status, max_enrollment")
      .eq("id", cohortId)
      .eq("course_id", courseId)
      .single();

    if (cohortError || !cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    // Get all enrollments for this cohort
    const { data: enrollments } = await tq
      .from("enrollments")
      .select("id, student_id, status, progress_percentage, completed_at, enrolled_at")
      .eq("course_id", courseId)
      .eq("class_id", cohortId);

    const allEnrollments = enrollments || [];
    const activeEnrollments = allEnrollments.filter(e => e.status === "active");
    const completedEnrollments = allEnrollments.filter(e => e.status === "completed");
    const droppedEnrollments = allEnrollments.filter(e => e.status === "dropped");

    // Calculate average progress
    const avgProgress = activeEnrollments.length > 0
      ? activeEnrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / activeEnrollments.length
      : 0;

    // Get average grade from course_grades for enrolled students
    const studentIds = allEnrollments.map(e => e.student_id).filter(Boolean);
    let avgGrade: number | null = null;

    if (studentIds.length > 0) {
      const { data: grades } = await tq
        .from("course_grades")
        .select("final_grade")
        .eq("course_id", courseId)
        .in("student_id", studentIds);

      if (grades && grades.length > 0) {
        const validGrades = grades.filter(g => g.final_grade != null);
        if (validGrades.length > 0) {
          avgGrade = validGrades.reduce((sum, g) => sum + Number(g.final_grade), 0) / validGrades.length;
        }
      }
    }

    // Progress distribution buckets
    const progressDistribution = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
    for (const e of activeEnrollments) {
      const p = e.progress_percentage || 0;
      if (p <= 25) progressDistribution["0-25"]++;
      else if (p <= 50) progressDistribution["26-50"]++;
      else if (p <= 75) progressDistribution["51-75"]++;
      else progressDistribution["76-100"]++;
    }

    // Completion rate
    const completionRate = allEnrollments.length > 0
      ? (completedEnrollments.length / allEnrollments.length) * 100
      : 0;

    // Drop rate
    const dropRate = allEnrollments.length > 0
      ? (droppedEnrollments.length / allEnrollments.length) * 100
      : 0;

    // Update cached analytics
    await tq
      .from("cohort_analytics")
      .upsert({
        cohort_id: cohortId,
        total_enrolled: allEnrollments.length,
        active_count: activeEnrollments.length,
        completed_count: completedEnrollments.length,
        dropped_count: droppedEnrollments.length,
        avg_progress: Math.round(avgProgress * 100) / 100,
        avg_grade: avgGrade !== null ? Math.round(avgGrade * 100) / 100 : null,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "cohort_id" });

    return NextResponse.json({
      cohort: {
        id: cohort.id,
        name: cohort.name,
        start_date: cohort.start_date,
        end_date: cohort.end_date,
        status: cohort.status,
        max_enrollment: cohort.max_enrollment,
      },
      analytics: {
        total_enrolled: allEnrollments.length,
        active_count: activeEnrollments.length,
        completed_count: completedEnrollments.length,
        dropped_count: droppedEnrollments.length,
        avg_progress: Math.round(avgProgress * 100) / 100,
        avg_grade: avgGrade !== null ? Math.round(avgGrade * 100) / 100 : null,
        completion_rate: Math.round(completionRate * 100) / 100,
        drop_rate: Math.round(dropRate * 100) / 100,
        progress_distribution: progressDistribution,
      },
    });
  } catch (e: any) {
    console.error("Cohort analytics GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
