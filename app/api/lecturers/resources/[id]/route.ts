import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/resources/[id] - Get a specific resource
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const { data: resource, error } = await supabase
      .from("lecturer_resources")
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(id, name, email)
      `)
      .eq("id", id)
      .single();

    if (error || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Get ratings for this resource
    const { data: ratings } = await supabase
      .from("lecturer_resource_ratings")
      .select(`
        *,
        user:users!user_id(id, name, email)
      `)
      .eq("resource_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Check if user has bookmarked this resource
    const { data: bookmark } = await supabase
      .from("lecturer_resource_bookmarks")
      .select("id")
      .eq("resource_id", id)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      resource: {
        ...resource,
        is_bookmarked: !!bookmark
      },
      ratings: ratings || []
    });
  } catch (error) {
    console.error("Get resource API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lecturers/resources/[id] - Update a resource
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the owner or admin
    const { data: resource } = await supabase
      .from("lecturer_resources")
      .select("uploaded_by")
      .eq("id", id)
      .single();

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (resource.uploaded_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, resource_type, subject_area, grade_level, tags, license_type, is_featured } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (resource_type !== undefined) updateData.resource_type = resource_type;
    if (subject_area !== undefined) updateData.subject_area = subject_area || null;
    if (grade_level !== undefined) updateData.grade_level = grade_level || null;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null);
    }
    if (license_type !== undefined) updateData.license_type = license_type;
    if (is_featured !== undefined && isAdmin) updateData.is_featured = is_featured;

    const { data: updatedResource, error } = await supabase
      .from("lecturer_resources")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating resource:", error);
      return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
    }

    return NextResponse.json({ resource: updatedResource });
  } catch (error) {
    console.error("Update resource API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/resources/[id] - Delete a resource
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the owner or admin
    const { data: resource } = await supabase
      .from("lecturer_resources")
      .select("uploaded_by, file_url")
      .eq("id", id)
      .single();

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (resource.uploaded_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Extract file path from URL and delete from storage
    if (resource.file_url) {
      try {
        const urlParts = resource.file_url.split('/');
        const fileName = urlParts.slice(-2).join('/'); // Get last two parts (lecturer-resources/filename)
        await supabase.storage.from('course-materials').remove([fileName]);
      } catch (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    const { error } = await supabase
      .from("lecturer_resources")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting resource:", error);
      return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

