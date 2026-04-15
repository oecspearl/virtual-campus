import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/cohorts/unassigned
 * List students enrolled in this course but not assigned to any section (class_id IS NULL).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["instructor", "curriculum_designer", "admin", "tenant_admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const { data: students, error } = await tq
      .from("enrollments")
      .select("id, student_id, student_name, student_email")
      .eq("course_id", courseId)
      .eq("status", "active")
      .is("class_id", null)
      .order("student_name", { ascending: true });

    if (error) {
      console.error("Error fetching unassigned students:", error);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    return NextResponse.json({ students: students || [] });
  } catch (e: any) {
    console.error("Unassigned students GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
