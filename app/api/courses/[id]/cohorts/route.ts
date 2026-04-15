import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/courses/[id]/cohorts
 * List all cohorts for a course with enrollment counts
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

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);
    const isStaff = hasRole(user.role, ["instructor", "curriculum_designer", "admin", "tenant_admin", "super_admin"]);

    // Get cohorts with enrollment count
    const { data: cohorts, error } = await tq
      .from("classes")
      .select(`
        id,
        course_id,
        name,
        description,
        section,
        term,
        schedule,
        max_enrollment,
        enrollment_code,
        enrollment_open,
        active,
        start_date,
        end_date,
        enrollment_start,
        enrollment_end,
        status,
        is_default,
        created_by,
        created_at,
        updated_at
      `)
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cohorts:", error);
      return NextResponse.json({ error: "Failed to fetch cohorts" }, { status: 500 });
    }

    // Get enrollment counts per cohort
    const cohortIds = (cohorts || []).map(c => c.id);
    let enrollmentCounts: Record<string, { active: number; completed: number; dropped: number }> = {};

    if (cohortIds.length > 0) {
      const { data: enrollments } = await tq
        .from("enrollments")
        .select("class_id, status")
        .eq("course_id", courseId)
        .in("class_id", cohortIds);

      if (enrollments) {
        for (const e of enrollments) {
          if (!e.class_id) continue;
          if (!enrollmentCounts[e.class_id]) {
            enrollmentCounts[e.class_id] = { active: 0, completed: 0, dropped: 0 };
          }
          if (e.status === "active") enrollmentCounts[e.class_id].active++;
          else if (e.status === "completed") enrollmentCounts[e.class_id].completed++;
          else if (e.status === "dropped") enrollmentCounts[e.class_id].dropped++;
        }
      }
    }

    // Get facilitators per cohort
    let facilitatorMap: Record<string, any[]> = {};
    if (cohortIds.length > 0) {
      const { data: facilitators } = await tq
        .from("cohort_facilitators")
        .select(`
          cohort_id,
          role,
          users:users!cohort_facilitators_user_id_fkey (id, name, email)
        `)
        .in("cohort_id", cohortIds);

      if (facilitators) {
        for (const f of facilitators) {
          if (!facilitatorMap[f.cohort_id]) facilitatorMap[f.cohort_id] = [];
          facilitatorMap[f.cohort_id].push(f);
        }
      }
    }

    const enrichedCohorts = (cohorts || []).map(c => ({
      ...c,
      enrollment_counts: enrollmentCounts[c.id] || { active: 0, completed: 0, dropped: 0 },
      facilitators: facilitatorMap[c.id] || [],
    }));

    // For students, also return which cohort they belong to
    let myCohort = null;
    if (!isStaff) {
      const { data: enrollment } = await tq
        .from("enrollments")
        .select("class_id")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .eq("status", "active")
        .not("class_id", "is", null)
        .maybeSingle();

      if (enrollment?.class_id) {
        myCohort = enrichedCohorts.find(c => c.id === enrollment.class_id) || null;
      }
    }

    return NextResponse.json({
      cohorts: enrichedCohorts,
      myCohort,
      isStaff,
    });
  } catch (e: any) {
    console.error("Cohorts GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/courses/[id]/cohorts
 * Create a new cohort
 */
export async function POST(
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

    const body = await request.json();
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const {
      name,
      description,
      section,
      term,
      max_enrollment,
      enrollment_open = true,
      start_date,
      end_date,
      enrollment_start,
      enrollment_end,
      status = "upcoming",
      is_default = false,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Cohort name is required" }, { status: 400 });
    }

    // If setting as default, unset any existing default
    if (is_default) {
      await tq
        .from("classes")
        .update({ is_default: false })
        .eq("course_id", courseId)
        .eq("is_default", true);
    }

    const { data: cohort, error } = await tq
      .from("classes")
      .insert([{
        course_id: courseId,
        name: name.trim(),
        description: description || null,
        section: section || null,
        term: term || null,
        max_enrollment: max_enrollment || null,
        enrollment_open,
        active: true,
        start_date: start_date || null,
        end_date: end_date || null,
        enrollment_start: enrollment_start || null,
        enrollment_end: enrollment_end || null,
        status,
        is_default,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating cohort:", error);
      return NextResponse.json({ error: "Failed to create cohort" }, { status: 500 });
    }

    return NextResponse.json({ success: true, cohort });
  } catch (e: any) {
    console.error("Cohorts POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]/cohorts
 * Update a cohort
 */
export async function PUT(
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

    const body = await request.json();
    const { cohort_id } = body;

    if (!cohort_id) {
      return NextResponse.json({ error: "Cohort ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "name", "description", "section", "term", "max_enrollment",
      "enrollment_open", "active", "start_date", "end_date",
      "enrollment_start", "enrollment_end", "status", "is_default",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If setting as default, unset any existing default
    if (body.is_default === true) {
      await tq
        .from("classes")
        .update({ is_default: false })
        .eq("course_id", courseId)
        .eq("is_default", true)
        .neq("id", cohort_id);
    }

    const { data: cohort, error } = await tq
      .from("classes")
      .update(updateData)
      .eq("id", cohort_id)
      .eq("course_id", courseId)
      .select()
      .single();

    if (error) {
      console.error("Error updating cohort:", error);
      return NextResponse.json({ error: "Failed to update cohort" }, { status: 500 });
    }

    return NextResponse.json({ success: true, cohort });
  } catch (e: any) {
    console.error("Cohorts PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]/cohorts
 * Archive or delete a cohort
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;
    if (!hasRole(user.role, ["admin", "tenant_admin", "super_admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohort_id");
    const force = searchParams.get("force") === "true";

    if (!cohortId) {
      return NextResponse.json({ error: "Cohort ID required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Check for active enrollments
    const { data: activeEnrollments } = await tq
      .from("enrollments")
      .select("id")
      .eq("class_id", cohortId)
      .eq("status", "active")
      .limit(1);

    if (activeEnrollments && activeEnrollments.length > 0 && !force) {
      // Archive instead of delete
      const { error } = await tq
        .from("classes")
        .update({ status: "archived", active: false, updated_at: new Date().toISOString() })
        .eq("id", cohortId)
        .eq("course_id", courseId);

      if (error) {
        console.error("Error archiving cohort:", error);
        return NextResponse.json({ error: "Failed to archive cohort" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "archived", message: "Cohort archived (has active enrollments)" });
    }

    const { error } = await tq
      .from("classes")
      .delete()
      .eq("id", cohortId)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error deleting cohort:", error);
      return NextResponse.json({ error: "Failed to delete cohort" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "deleted" });
  } catch (e: any) {
    console.error("Cohorts DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
