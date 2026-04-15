import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { withTenantAuth } from "@/lib/with-tenant-auth";

export const GET = withTenantAuth(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const me = searchParams.get("me");

  if (me === "1") {
    const serviceSupabase = createServiceSupabaseClient();

    // Get user's course enrollments
    const { data: enrollments, error: enrollmentsError } = await serviceSupabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        student_id,
        class_id,
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
        ),
        classes (
          id,
          name
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

  // Get all enrollments (admin view)
  const serviceSupabase = createServiceSupabaseClient();
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
});
