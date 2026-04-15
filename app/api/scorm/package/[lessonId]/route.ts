import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) return createAuthResponse(authResult.error!, authResult.status!);
    const user = authResult.userProfile!;

    const { lessonId } = await params;
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();
    const supabase = await createServerSupabaseClient();

    // Verify user has access: must be enrolled in the course or be staff
    const isStaff = ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'].includes(user.role);
    if (!isStaff) {
      // Get the course_id for this lesson
      const { data: lesson } = await serviceSupabase
        .from('lessons')
        .select('course_id')
        .eq('id', lessonId)
        .single();

      if (lesson?.course_id) {
        const { data: enrollment } = await serviceSupabase
          .from('enrollments')
          .select('id')
          .eq('student_id', user.id)
          .eq('course_id', lesson.course_id)
          .single();

        if (!enrollment) {
          return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
        }
      }
    }

    // Get SCORM package for this lesson
    const { data: scormPackage, error: packageError } = await serviceSupabase
      .from('scorm_packages')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (packageError) {
      if (packageError.code === 'PGRST116') {
        // No package found
        return NextResponse.json({ scormPackage: null });
      }
      throw packageError;
    }

    // Return a same-origin proxy URL so the SCORM iframe can access window.parent.API.
    // Direct Supabase URLs are cross-origin and block SCORM API communication.
    if (scormPackage.package_url) {
      const proxyUrl = `/api/scorm/serve/${scormPackage.package_url}`;

      return NextResponse.json({
        scormPackage: {
          ...scormPackage,
          package_url: proxyUrl
        }
      });
    }

    return NextResponse.json({ scormPackage });

  } catch (error: any) {
    console.error('Error fetching SCORM package:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch SCORM package"
    }, { status: 500 });
  }
}

