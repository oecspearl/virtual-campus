import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { lessonId } = await params;
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    // Use service client to avoid RLS infinite recursion issues
    // The service client bypasses RLS policies
    const serviceSupabase = createServiceSupabaseClient();
    const supabase = await createServerSupabaseClient();

    // Get SCORM package for this lesson using service client to avoid RLS recursion
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

    // Get public URL for the package
    if (scormPackage.package_url) {
      const { data: urlData } = supabase.storage
        .from('course-materials')
        .getPublicUrl(scormPackage.package_url);

      return NextResponse.json({
        scormPackage: {
          ...scormPackage,
          package_url: urlData.publicUrl
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

