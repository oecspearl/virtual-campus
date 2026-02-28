import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// PUT /api/lecturers/forums/posts/replies/[id] - Update a reply
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: replyId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the author or admin
    const { data: reply } = await supabase
      .from("lecturer_forum_replies")
      .select("author_id")
      .eq("id", replyId)
      .single();

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (reply.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { content, is_solution } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (content !== undefined) updateData.content = content.trim();
    if (is_solution !== undefined) updateData.is_solution = is_solution;

    const { data: updatedReply, error } = await supabase
      .from("lecturer_forum_replies")
      .update(updateData)
      .eq("id", replyId)
      .select(`
        *,
        author:users!author_id(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating reply:", error);
      return NextResponse.json({ error: "Failed to update reply" }, { status: 500 });
    }

    return NextResponse.json({ reply: updatedReply });
  } catch (error) {
    console.error("Update reply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/forums/posts/replies/[id] - Delete a reply
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: replyId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the author or admin
    const { data: reply } = await supabase
      .from("lecturer_forum_replies")
      .select("author_id")
      .eq("id", replyId)
      .single();

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (reply.author_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await supabase
      .from("lecturer_forum_replies")
      .delete()
      .eq("id", replyId);

    if (error) {
      console.error("Error deleting reply:", error);
      return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete reply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

