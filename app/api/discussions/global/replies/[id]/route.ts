import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// PUT /api/discussions/global/replies/[id] - Update a reply
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const isAdmin = ["admin", "super_admin"].includes(userProfile?.role);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership
    const { data: existingReply, error: fetchError } = await tq
      .from("global_discussion_replies")
      .select("author_id, discussion_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (existingReply.author_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only edit your own replies" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, is_solution, is_hidden } = body;

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      if (!content.trim()) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      updates.content = content.trim();
    }

    // Only admins can hide replies
    if (isAdmin && is_hidden !== undefined) {
      updates.is_hidden = is_hidden;
    }

    // Handle solution marking
    if (is_solution !== undefined) {
      // Get discussion author to verify permission
      const { data: discussion } = await tq
        .from("global_discussions")
        .select("author_id")
        .eq("id", existingReply.discussion_id)
        .single();

      if (discussion?.author_id === user.id || isAdmin) {
        if (is_solution) {
          // Unmark other solutions first
          await tq
            .from("global_discussion_replies")
            .update({ is_solution: false })
            .eq("discussion_id", existingReply.discussion_id);
        }
        updates.is_solution = is_solution;
      }
    }

    const { data: reply, error: updateError } = await tq
      .from("global_discussion_replies")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        author:users!global_discussion_replies_author_id_fkey(id, name, email)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating reply:", updateError);
      return NextResponse.json(
        { error: "Failed to update reply" },
        { status: 500 }
      );
    }

    return NextResponse.json(reply);
  } catch (error) {
    console.error("Update reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/discussions/global/replies/[id] - Delete a reply
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const isAdmin = ["admin", "super_admin"].includes(userProfile?.role);

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check ownership
    const { data: existingReply, error: fetchError } = await tq
      .from("global_discussion_replies")
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (existingReply.author_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own replies" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await tq
      .from("global_discussion_replies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting reply:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
