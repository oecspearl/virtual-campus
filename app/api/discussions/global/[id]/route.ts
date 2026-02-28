import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/discussions/global/[id] - Get a single discussion with replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Increment view count (ignore errors if function doesn't exist)
    try {
      await tq.raw.rpc("increment_view_count", { discussion_id: id });
    } catch {
      // If the function doesn't exist, just continue
    }

    // Get discussion
    const { data: discussion, error: discussionError } = await tq
      .from("global_discussions")
      .select(
        `
        *,
        category:global_discussion_categories(id, name, slug, icon, color),
        author:users!global_discussions_author_id_fkey(id, name, email)
      `
      )
      .eq("id", id)
      .single();

    if (discussionError || !discussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    // Get replies with nested structure
    const { data: replies, error: repliesError } = await tq
      .from("global_discussion_replies")
      .select(
        `
        *,
        author:users!global_discussion_replies_author_id_fkey(id, name, email)
      `
      )
      .eq("discussion_id", id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (repliesError) {
      console.error("Error fetching replies:", repliesError);
    }

    // Build tree structure for nested replies
    const replyMap = new Map();
    const rootReplies: any[] = [];

    (replies || []).forEach((reply) => {
      replyMap.set(reply.id, { ...reply, children: [] });
    });

    (replies || []).forEach((reply) => {
      if (reply.parent_reply_id) {
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) {
          parent.children.push(replyMap.get(reply.id));
        }
      } else {
        rootReplies.push(replyMap.get(reply.id));
      }
    });

    return NextResponse.json({
      discussion,
      replies: rootReplies,
    });
  } catch (error) {
    console.error("Get global discussion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/discussions/global/[id] - Update a discussion
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
    const { data: existingDiscussion, error: fetchError } = await tq
      .from("global_discussions")
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingDiscussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    if (existingDiscussion.author_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only edit your own discussions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category_id, is_pinned, is_locked, is_featured } =
      body;

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category_id !== undefined) updates.category_id = category_id;

    // Only admins can change these
    if (isAdmin) {
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;
      if (is_locked !== undefined) updates.is_locked = is_locked;
      if (is_featured !== undefined) updates.is_featured = is_featured;
    }

    const { data: discussion, error: updateError } = await tq
      .from("global_discussions")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        category:global_discussion_categories(id, name, slug, icon, color),
        author:users!global_discussions_author_id_fkey(id, name, email)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating discussion:", updateError);
      return NextResponse.json(
        { error: "Failed to update discussion" },
        { status: 500 }
      );
    }

    return NextResponse.json(discussion);
  } catch (error) {
    console.error("Update global discussion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/discussions/global/[id] - Delete a discussion
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
    const { data: existingDiscussion, error: fetchError } = await tq
      .from("global_discussions")
      .select("author_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingDiscussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    if (existingDiscussion.author_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own discussions" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await tq
      .from("global_discussions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting discussion:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete discussion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete global discussion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
