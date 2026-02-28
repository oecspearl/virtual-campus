import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// POST /api/lecturers/resources/[id]/download - Record a download
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    // Check if resource exists
    const { data: resource, error: resourceError } = await supabase
      .from("lecturer_resources")
      .select("id, file_url")
      .eq("id", resourceId)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Record download (trigger will update download_count)
    const { error: downloadError } = await supabase
      .from("lecturer_resource_downloads")
      .insert([{
        resource_id: resourceId,
        user_id: user.id
      }]);

    if (downloadError) {
      console.error("Error recording download:", downloadError);
      // Don't fail the request if download tracking fails
    }

    return NextResponse.json({ 
      success: true,
      file_url: resource.file_url 
    });
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

