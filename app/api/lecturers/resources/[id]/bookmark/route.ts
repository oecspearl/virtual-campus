import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// POST /api/lecturers/resources/[id]/bookmark - Bookmark a resource
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if already bookmarked
    const { data: existing } = await supabase
      .from("lecturer_resource_bookmarks")
      .select("id")
      .eq("resource_id", resourceId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, bookmarked: true });
    }

    const { error } = await supabase
      .from("lecturer_resource_bookmarks")
      .insert([{
        resource_id: resourceId,
        user_id: user.id
      }]);

    if (error) {
      console.error("Error bookmarking resource:", error);
      return NextResponse.json({ error: "Failed to bookmark resource" }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookmarked: true });
  } catch (error) {
    console.error("Bookmark API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/resources/[id]/bookmark - Remove bookmark
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("lecturer_resource_bookmarks")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error removing bookmark:", error);
      return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookmarked: false });
  } catch (error) {
    console.error("Remove bookmark API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

