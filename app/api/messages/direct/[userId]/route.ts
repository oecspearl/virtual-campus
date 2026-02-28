import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/direct/[userId] - Get or create direct message room with a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    if (user.id === otherUserId) {
      return NextResponse.json(
        { error: "Cannot start a conversation with yourself" },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if other user exists
    const { data: otherUser, error: userError } = await tq
      .from("users")
      .select("id, name, email")
      .eq("id", otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has blocked the other user or vice versa
    const { data: blocked } = await tq
      .from("student_chat_blocked_users")
      .select("id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
      );

    if (blocked && blocked.length > 0) {
      return NextResponse.json(
        { error: "Cannot message this user" },
        { status: 403 }
      );
    }

    // Look for existing direct message room
    const { data: existingRooms } = await tq
      .from("student_chat_rooms")
      .select(
        `
        id,
        student_chat_members!inner(user_id)
      `
      )
      .eq("room_type", "direct")
      .eq("is_archived", false);

    // Find a room where both users are members
    let existingRoom = null;
    for (const room of existingRooms || []) {
      const memberIds = room.student_chat_members.map((m: any) => m.user_id);
      if (
        memberIds.length === 2 &&
        memberIds.includes(user.id) &&
        memberIds.includes(otherUserId)
      ) {
        existingRoom = room;
        break;
      }
    }

    if (existingRoom) {
      // Return existing room with details
      const { data: roomDetails } = await tq
        .from("student_chat_rooms")
        .select("*")
        .eq("id", existingRoom.id)
        .single();

      return NextResponse.json({
        room: {
          ...roomDetails,
          display_name: otherUser.name,
          other_user: otherUser,
          is_new: false,
        },
      });
    }

    // Create new direct message room
    const { data: newRoom, error: roomError } = await tq
      .from("student_chat_rooms")
      .insert([
        {
          room_type: "direct",
          created_by: user.id,
        },
      ])
      .select("*")
      .single();

    if (roomError) {
      console.error("Error creating DM room:", roomError);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Add both users as members
    const { error: membersError } = await tq
      .from("student_chat_members")
      .insert([
        {
          room_id: newRoom.id,
          user_id: user.id,
          member_role: "owner",
        },
        {
          room_id: newRoom.id,
          user_id: otherUserId,
          member_role: "member",
        },
      ]);

    if (membersError) {
      console.error("Error adding DM members:", membersError);
      // Clean up the room
      await tq.from("student_chat_rooms").delete().eq("id", newRoom.id);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        room: {
          ...newRoom,
          display_name: otherUser.name,
          other_user: otherUser,
          is_new: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Get/create DM error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/direct/[userId] - Same as GET (for compatibility)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return GET(request, { params });
}
