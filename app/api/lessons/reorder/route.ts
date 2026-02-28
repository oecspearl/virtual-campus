import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { userProfile } = authResult;

    // Check if user has permission to reorder lessons
    if (!hasRole(userProfile.role, ["admin", "super_admin", "curriculum_designer"])) {
      return NextResponse.json({ error: "Forbidden: Admin or Curriculum Designer access required" }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, lessonOrders } = body;

    if (!courseId || !Array.isArray(lessonOrders)) {
      return NextResponse.json({ error: "courseId and lessonOrders array are required" }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Validate that all lessons belong to the specified course
    const { data: existingLessons, error: fetchError } = await tq.from('lessons')
      .select('id, course_id')
      .in('id', lessonOrders.map((item: any) => item.lessonId));

    if (fetchError) {
      console.error('Error fetching lessons:', fetchError);
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
    }

    // Check if all lessons belong to the specified course
    const invalidLessons = existingLessons?.filter(lesson => lesson.course_id !== courseId);
    if (invalidLessons && invalidLessons.length > 0) {
      return NextResponse.json({ 
        error: "Some lessons do not belong to the specified course" 
      }, { status: 400 });
    }

    // Update lesson orders
    const updatePromises = lessonOrders.map((item: { lessonId: string; order: number }) =>
      tq.from('lessons')
        .update({ 
          order: item.order,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.lessonId)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating lesson orders:', errors);
      return NextResponse.json({ error: "Failed to update some lesson orders" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully reordered ${lessonOrders.length} lessons` 
    });

  } catch (e: any) {
    console.error('Lesson reorder API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
