import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    // Check if user can view this student's activity (own or admin/instructor)
    const canViewAll = hasRole(user.role, ['admin', 'super_admin', 'instructor', 'curriculum_designer']);
    
    if (studentId !== user.id && !canViewAll) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const serviceSupabase = createServiceSupabaseClient();

    // Build query
    let query = serviceSupabase
      .from('student_activity_log')
      .select(`
        *,
        courses:course_id (
          id,
          title
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Activity log fetch error:', error);
      return NextResponse.json({
        error: "Failed to fetch activity log"
      }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = serviceSupabase
      .from('student_activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId);

    if (courseId) {
      countQuery = countQuery.eq('course_id', courseId);
    }

    const { count } = await countQuery;

    return NextResponse.json({ 
      activities: activities || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (e: any) {
    console.error('Activity log GET API error:', e);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

