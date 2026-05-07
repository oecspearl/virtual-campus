import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { recomputeCourseGradeSummariesForCourse } from "@/lib/services/gradebook-summary";

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

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: gradeItems, error } = await tq
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Grade items fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch grade items" }, { status: 500 });
    }

    return NextResponse.json({ items: gradeItems || [] });

  } catch (e: any) {
    console.error('Grade items GET API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    // Check if user has access to this course
    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, ["admin", "super_admin", "curriculum_designer"]);

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = await request.json();
    const { title, type, category, points, assessment_id, due_date, weight } = data;

    if (!title || !type || !category || !points) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: gradeItem, error } = await tq
      .from("course_grade_items")
      .insert([{
        course_id: courseId,
        title: String(title),
        type: String(type),
        category: String(category),
        points: Number(points),
        assessment_id: assessment_id || null,
        due_date: due_date || null,
        weight: Number(weight || 1.0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Grade item creation error:', error);
      return NextResponse.json({ error: "Failed to create grade item" }, { status: 500 });
    }

    return NextResponse.json(gradeItem);

  } catch (e: any) {
    console.error('Grade item POST API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]/gradebook/items
 *   body: { item_ids: string[], category_id: string | null }
 *
 * Bulk-move many items to a target category in a single round-trip.
 * Used by the staff "items mover" UI.
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

    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    const isInstructor = await checkCourseInstructor(tq, user.id, courseId);
    const isAdmin = hasRole(user.role, [
      "admin",
      "super_admin",
      "tenant_admin",
      "curriculum_designer",
    ]);
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const itemIds: unknown = body?.item_ids;
    const categoryId: string | null = body?.category_id ?? null;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "item_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    if (categoryId) {
      const { data: cat } = await tq
        .from("course_grade_categories")
        .select("id")
        .eq("id", categoryId)
        .eq("course_id", courseId)
        .single();
      if (!cat) {
        return NextResponse.json(
          { error: "Target category not found in this course" },
          { status: 400 }
        );
      }
    }

    const { data: moved, error } = await tq
      .from("course_grade_items")
      .update({ category_id: categoryId, updated_at: new Date().toISOString() })
      .in("id", itemIds as string[])
      .eq("course_id", courseId)
      .select("id");

    if (error) {
      console.error("Bulk move error:", error);
      return NextResponse.json({ error: "Failed to move items" }, { status: 500 });
    }

    recomputeCourseGradeSummariesForCourse(tq, courseId).catch((err) =>
      console.error("Grade summary recompute failed:", err)
    );

    return NextResponse.json({ moved: Array.isArray(moved) ? moved.length : 0 });
  } catch (e) {
    console.error("Bulk move PUT error:", e);
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
