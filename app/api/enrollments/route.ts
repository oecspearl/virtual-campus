import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const me = searchParams.get("me");
    
    if (me === "1") {
      // Authenticate user for personal enrollments
      const authResult = await authenticateUser(request);
      if (!authResult.success) {
        return createAuthResponse(authResult.error!, authResult.status!);
      }

      const { user } = authResult;
      const serviceSupabase = createServiceSupabaseClient();

      // Get user's course enrollments
      const { data: enrollments, error: enrollmentsError } = await serviceSupabase
        .from('enrollments')
        .select(`
          id,
          course_id,
          student_id,
          status,
          enrolled_at,
          updated_at,
          courses (
            id,
            title,
            description,
            thumbnail,
            difficulty,
            grade_level,
            subject_area,
            published
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
      }

      return NextResponse.json({ enrollments: enrollments || [] });
    }

    // Get all enrollments (admin view) - require authentication
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const supabase = await createServerSupabaseClient();
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        student_id,
        status,
        enrolled_at,
        updated_at,
        courses (
          id,
          title,
          published
        ),
        users (
          id,
          name,
          email
        )
      `)
      .order('enrolled_at', { ascending: false })
      .limit(200);

    if (enrollmentsError) {
      console.error('Error fetching all enrollments:', enrollmentsError);
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    return NextResponse.json({ enrollments: enrollments || [] });

  } catch (error) {
    console.error('Enrollments API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
