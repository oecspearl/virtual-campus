import { NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request as any);
    const tq = createTenantQuery(tenantId);

    // Get course details (published courses only for preview)
    const { data: course, error: courseError } = await tq
      .from("courses")
      .select("*")
      .eq("id", id)
      .eq("published", true)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found or not available for preview" },
        { status: 404 }
      );
    }

    // Get lessons (published only)
    const { data: lessons, error: lessonsError } = await tq
      .from("lessons")
      .select("id, title, description, order, estimated_duration")
      .eq("course_id", id)
      .eq("published", true)
      .order("order", { ascending: true })
      .limit(10); // Limit to first 10 lessons for preview

    // Get course instructors
    const { data: instructors, error: instructorsError } = await tq
      .from("course_instructors")
      .select(`
        user:users(id, name, email, avatar, bio)
      `)
      .eq("course_id", id);

    // Get enrollment count (for display purposes)
    const { count: enrollmentCount } = await tq
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id)
      .eq("status", "active");

    return NextResponse.json({
      course: {
        ...course,
        enrollment_count: enrollmentCount || 0,
      },
      lessons: lessons || [],
      instructors: instructors?.map((i) => i.user) || [],
    });
  } catch (error) {
    console.error("Course preview API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
