import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { getCurrentUser } from "@/lib/database-helpers";
import { hasRole } from "@/lib/rbac";

export async function GET(
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
