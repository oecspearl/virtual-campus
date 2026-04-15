import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/cohorts/[cohortId]/members
 * List enrolled students in a cohort
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

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const isStaff = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "tenant_admin", "super_admin"]);

    if (!isStaff) {
      // Students can only see members if they're in this cohort
      const { data: enrollment } = await tq
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("class_id", cohortId)
        .eq("student_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "Not a member of this cohort" }, { status: 403 });
      }
    }

    const { data: members, error } = await tq
      .from("enrollments")
      .select(`
        id,
        student_id,
        status,
        enrolled_at,
        progress_percentage,
        completed_at,
        student_name,
        student_email,
        student_avatar
      `)
      .eq("course_id", courseId)
      .eq("class_id", cohortId)
      .order("enrolled_at", { ascending: true });

    if (error) {
      console.error("Error fetching cohort members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (e: any) {
    console.error("Cohort members GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/courses/[id]/cohorts/[cohortId]/members
 * Add students to a cohort or move between cohorts
 */
export async function POST(
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

    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    if (body.action === "move") {
      // Move a student from one cohort to this one
      const { student_id, from_cohort_id } = body;
      if (!student_id) {
        return NextResponse.json({ error: "Student ID required" }, { status: 400 });
      }

      const { error } = await tq
        .from("enrollments")
        .update({ class_id: cohortId, updated_at: new Date().toISOString() })
        .eq("course_id", courseId)
        .eq("student_id", student_id)
        .eq("class_id", from_cohort_id || null);

      if (error) {
        console.error("Error moving student:", error);
        return NextResponse.json({ error: "Failed to move student" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "moved" });

    } else if (body.action === "bulk_add") {
      // Bulk add student IDs to this cohort (assigns class_id on existing enrollments)
      const { student_ids } = body;
      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return NextResponse.json({ error: "Student IDs required" }, { status: 400 });
      }

      // Check cohort capacity
      const { data: cohort } = await tq
        .from("classes")
        .select("max_enrollment")
        .eq("id", cohortId)
        .single();

      if (cohort?.max_enrollment) {
        const { data: currentMembers } = await tq
          .from("enrollments")
          .select("id")
          .eq("class_id", cohortId)
          .eq("status", "active");

        const currentCount = currentMembers?.length || 0;
        if (currentCount + student_ids.length > cohort.max_enrollment) {
          return NextResponse.json({
            error: `Cohort capacity exceeded. ${cohort.max_enrollment - currentCount} spots remaining.`,
          }, { status: 400 });
        }
      }

      let assigned = 0;
      for (const studentId of student_ids) {
        // Update existing enrollment to add cohort
        const { data: updated } = await tq
          .from("enrollments")
          .update({ class_id: cohortId, updated_at: new Date().toISOString() })
          .eq("course_id", courseId)
          .eq("student_id", studentId)
          .eq("status", "active")
          .select("id")
          .maybeSingle();

        if (updated) {
          assigned++;
        }
      }

      return NextResponse.json({ success: true, assigned });

    } else if (body.action === "remove") {
      // Remove student from cohort (set class_id to null, don't drop enrollment)
      const { student_id } = body;
      if (!student_id) {
        return NextResponse.json({ error: "Student ID required" }, { status: 400 });
      }

      const { error } = await tq
        .from("enrollments")
        .update({ class_id: null, updated_at: new Date().toISOString() })
        .eq("course_id", courseId)
        .eq("student_id", student_id)
        .eq("class_id", cohortId);

      if (error) {
        console.error("Error removing from cohort:", error);
        return NextResponse.json({ error: "Failed to remove from cohort" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "removed" });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("Cohort members POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
