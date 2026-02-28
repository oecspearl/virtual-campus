import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/discussions/global/[id]/replies - Get replies for a discussion
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: discussionId } = await params;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: replies, error } = await tq
      .from("global_discussion_replies")
      .select(
        `
        *,
        author:users!global_discussion_replies_author_id_fkey(id, name, email)
      `
      )
      .eq("discussion_id", discussionId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
      return NextResponse.json(
        { error: "Failed to fetch replies" },
        { status: 500 }
      );
    }

    // Build tree structure
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

    return NextResponse.json({ replies: rootReplies });
  } catch (error) {
    console.error("Get replies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/discussions/global/[id]/replies - Create a reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: discussionId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if discussion exists and is not locked
    const { data: discussion, error: discussionError } = await tq
      .from("global_discussions")
      .select("id, is_locked, author_id")
      .eq("id", discussionId)
      .single();

    if (discussionError || !discussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      );
    }

    if (discussion.is_locked) {
      return NextResponse.json(
        { error: "This discussion is locked" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, parent_reply_id, is_solution = false } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Verify parent reply exists if provided
    if (parent_reply_id) {
      const { data: parentReply, error: parentError } = await tq
        .from("global_discussion_replies")
        .select("id")
        .eq("id", parent_reply_id)
        .eq("discussion_id", discussionId)
        .single();

      if (parentError || !parentReply) {
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
      }
    }

    // Only discussion author can mark as solution
    const canMarkSolution =
      is_solution && discussion.author_id === user.id;

    // If marking as solution, unmark other solutions first
    if (canMarkSolution) {
      await tq
        .from("global_discussion_replies")
        .update({ is_solution: false })
        .eq("discussion_id", discussionId);
    }

    const { data: reply, error: replyError } = await tq
      .from("global_discussion_replies")
      .insert([
        {
          discussion_id: discussionId,
          author_id: user.id,
          content: content.trim(),
          parent_reply_id: parent_reply_id || null,
          is_solution: canMarkSolution,
        },
      ])
      .select(
        `
        *,
        author:users!global_discussion_replies_author_id_fkey(id, name, email)
      `
      )
      .single();

    if (replyError) {
      console.error("Error creating reply:", replyError);
      return NextResponse.json(
        { error: "Failed to create reply" },
        { status: 500 }
      );
    }

    // Send notifications to discussion subscribers (in background)
    sendReplyNotifications(tenantId, discussionId, user.id, reply.id).catch((err) =>
      console.error("Failed to send reply notifications:", err)
    );

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Create reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to send notifications to subscribers
async function sendReplyNotifications(
  tenantId: string,
  discussionId: string,
  replyAuthorId: string,
  replyId: string
) {
  try {
    const tq = createTenantQuery(tenantId);

    // Get discussion details
    const { data: discussion } = await tq
      .from("global_discussions")
      .select("title, author_id")
      .eq("id", discussionId)
      .single();

    if (!discussion) return;

    // Get subscribers (excluding the reply author)
    const { data: subscriptions } = await tq
      .from("global_discussion_subscriptions")
      .select("user_id")
      .eq("discussion_id", discussionId)
      .eq("notify_on_reply", true)
      .neq("user_id", replyAuthorId);

    if (!subscriptions || subscriptions.length === 0) return;

    // Get reply author name
    const { data: replyAuthor } = await tq
      .from("users")
      .select("name")
      .eq("id", replyAuthorId)
      .single();

    // Create notifications for each subscriber
    const notifications = subscriptions.map((sub) => ({
      user_id: sub.user_id,
      type: "discussion_reply",
      title: "New reply to discussion",
      message: `${replyAuthor?.name || "Someone"} replied to "${discussion.title}"`,
      data: {
        discussion_id: discussionId,
        reply_id: replyId,
      },
      is_read: false,
    }));

    // Insert notifications
    await tq.from("notifications").insert(notifications);
  } catch (error) {
    console.error("Error sending reply notifications:", error);
  }
}
