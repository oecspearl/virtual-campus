import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/rooms/[id]/members - Get members of a chat room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is a member
    const { data: membership } = await serviceSupabase
      .from("student_chat_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this chat room" },
        { status: 403 }
      );
    }

    // Get all members
    const { data: members, error } = await serviceSupabase
      .from("student_chat_members")
      .select(
        `
        id,
        user_id,
        member_role,
        is_muted,
        joined_at,
        user:users!student_chat_members_user_id_fkey(id, name, email)
      `
      )
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/rooms/[id]/members - Add members to a chat room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const serviceSupabase = createServiceSupabaseClient();

    // Check if user is admin/owner
    const { data: membership } = await serviceSupabase
      .from("student_chat_members")
      .select("member_role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.member_role)) {
      return NextResponse.json(
        { error: "Only room admins can add members" },
        { status: 403 }
      );
    }

    // Check room type - can't add to direct messages
    const { data: room } = await serviceSupabase
      .from("student_chat_rooms")
      .select("room_type")
      .eq("id", roomId)
      .single();

    if (room?.room_type === "direct") {
      return NextResponse.json(
        { error: "Cannot add members to direct messages" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { user_ids } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "user_ids array is required" },
        { status: 400 }
      );
    }

    // Get existing members to avoid duplicates
    const { data: existingMembers } = await serviceSupabase
      .from("student_chat_members")
      .select("user_id")
      .eq("room_id", roomId);

    const existingIds = new Set((existingMembers || []).map((m) => m.user_id));

    // Filter out existing members
    const newMemberIds = user_ids.filter((id: string) => !existingIds.has(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { message: "All users are already members" },
        { status: 200 }
      );
    }

    // Add new members
    const membersToAdd = newMemberIds.map((userId: string) => ({
      room_id: roomId,
      user_id: userId,
      member_role: "member",
    }));

    const { data: addedMembers, error } = await serviceSupabase
      .from("student_chat_members")
      .insert(membersToAdd)
      .select(
        `
        id,
        user_id,
        member_role,
        joined_at,
        user:users!student_chat_members_user_id_fkey(id, name, email)
      `
      );

    if (error) {
      console.error("Error adding members:", error);
      return NextResponse.json(
        { error: "Failed to add members" },
        { status: 500 }
      );
    }

    // Create system message for new members
    const memberNames = (addedMembers || [])
      .map((m) => (m.user as any)?.name || "Unknown")
      .join(", ");

    await serviceSupabase.from("student_chat_messages").insert([
      {
        room_id: roomId,
        sender_id: user.id,
        content: `${memberNames} joined the chat`,
        message_type: "system",
      },
    ]);

    return NextResponse.json({
      added: addedMembers || [],
      message: `Added ${newMemberIds.length} member(s)`,
    });
  } catch (error) {
    console.error("Add members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/rooms/[id]/members - Leave or remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("user_id");

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const serviceSupabase = createServiceSupabaseClient();

    // If no target user specified, user is leaving
    const userIdToRemove = targetUserId || user.id;
    const isLeaving = userIdToRemove === user.id;

    if (!isLeaving) {
      // Check if user has permission to remove others
      const { data: membership } = await serviceSupabase
        .from("student_chat_members")
        .select("member_role")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();

      if (!membership || !["owner", "admin"].includes(membership.member_role)) {
        return NextResponse.json(
          { error: "Only room admins can remove members" },
          { status: 403 }
        );
      }

      // Can't remove the owner
      const { data: targetMembership } = await serviceSupabase
        .from("student_chat_members")
        .select("member_role")
        .eq("room_id", roomId)
        .eq("user_id", userIdToRemove)
        .single();

      if (targetMembership?.member_role === "owner") {
        return NextResponse.json(
          { error: "Cannot remove the room owner" },
          { status: 403 }
        );
      }
    }

    // Remove the member
    const { error } = await serviceSupabase
      .from("student_chat_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userIdToRemove);

    if (error) {
      console.error("Error removing member:", error);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    // Get user name for system message
    const { data: removedUser } = await serviceSupabase
      .from("users")
      .select("name")
      .eq("id", userIdToRemove)
      .single();

    // Create system message
    const action = isLeaving ? "left" : "was removed from";
    await serviceSupabase.from("student_chat_messages").insert([
      {
        room_id: roomId,
        sender_id: user.id,
        content: `${removedUser?.name || "Someone"} ${action} the chat`,
        message_type: "system",
      },
    ]);

    return NextResponse.json({
      success: true,
      message: isLeaving ? "Left the chat room" : "Member removed",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
