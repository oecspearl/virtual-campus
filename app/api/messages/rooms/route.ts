import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/rooms - Get all chat rooms for the current user
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Get rooms the user is a member of
    const { data: memberships, error: membershipError } = await tq
      .from("student_chat_members")
      .select("room_id, member_role, is_muted, unread_count, last_read_at")
      .eq("user_id", user.id);

    if (membershipError) {
      console.error("Error fetching memberships:", membershipError);
      return NextResponse.json(
        { error: "Failed to fetch chat rooms" },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    const roomIds = memberships.map((m) => m.room_id);

    // Get room details
    const { data: rooms, error: roomsError } = await tq
      .from("student_chat_rooms")
      .select(
        `
        *,
        created_by_user:users!student_chat_rooms_created_by_fkey(id, name, email)
      `
      )
      .in("id", roomIds)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      return NextResponse.json(
        { error: "Failed to fetch chat rooms" },
        { status: 500 }
      );
    }

    // Get members for each room
    const { data: allMembers } = await tq
      .from("student_chat_members")
      .select(
        `
        room_id,
        user_id,
        member_role,
        user:users!student_chat_members_user_id_fkey(id, name, email)
      `
      )
      .in("room_id", roomIds);

    // Group members by room_id
    const membersByRoom = new Map<string, any[]>();
    (allMembers || []).forEach((member) => {
      const roomMembers = membersByRoom.get(member.room_id) || [];
      roomMembers.push(member);
      membersByRoom.set(member.room_id, roomMembers);
    });

    // Create membership map for quick lookup
    const membershipMap = new Map<string, { room_id: string; member_role: string; is_muted: boolean; unread_count: number; last_read_at: string | null }>(
      memberships.map((m: any) => [m.room_id, m])
    );

    // Combine room data with members and user's membership info
    const roomsWithDetails = (rooms || []).map((room) => {
      const roomMembers = membersByRoom.get(room.id) || [];
      const userMembership = membershipMap.get(room.id);

      // For direct messages, get the other person's name
      let displayName = room.name;
      if (room.room_type === "direct" && roomMembers.length === 2) {
        const otherMember = roomMembers.find((m) => m.user_id !== user.id);
        displayName = otherMember?.user?.name || "Unknown User";
      }

      return {
        ...room,
        display_name: displayName,
        members: roomMembers,
        member_count: roomMembers.length,
        my_role: userMembership?.member_role || "member",
        is_muted: userMembership?.is_muted || false,
        unread_count: userMembership?.unread_count || 0,
        last_read_at: userMembership?.last_read_at,
      };
    });

    return NextResponse.json({ rooms: roomsWithDetails });
  } catch (error) {
    console.error("Get rooms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/rooms - Create a new chat room
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    const body = await request.json();
    const {
      name,
      description,
      room_type = "group",
      member_ids = [],
    } = body;

    // Validate room type
    if (!["direct", "group", "study_group"].includes(room_type)) {
      return NextResponse.json(
        { error: "Invalid room type" },
        { status: 400 }
      );
    }

    // For direct messages, must have exactly one other member
    if (room_type === "direct") {
      if (member_ids.length !== 1) {
        return NextResponse.json(
          { error: "Direct messages require exactly one other participant" },
          { status: 400 }
        );
      }
    }

    // For group chats, name is required
    if (room_type !== "direct" && !name?.trim()) {
      return NextResponse.json(
        { error: "Name is required for group chats" },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // For direct messages, check if conversation already exists
    if (room_type === "direct") {
      const otherUserId = member_ids[0];

      // Check for existing direct message room
      const { data: existingRoom } = await tq
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
      const existingDM = (existingRoom || []).find((room) => {
        const memberIds = room.student_chat_members.map((m: any) => m.user_id);
        return (
          memberIds.length === 2 &&
          memberIds.includes(user.id) &&
          memberIds.includes(otherUserId)
        );
      });

      if (existingDM) {
        // Return existing room
        const { data: roomData } = await tq
          .from("student_chat_rooms")
          .select("*")
          .eq("id", existingDM.id)
          .single();

        return NextResponse.json(roomData);
      }
    }

    // Create the room
    const { data: room, error: roomError } = await tq
      .from("student_chat_rooms")
      .insert([
        {
          name: room_type === "direct" ? null : name?.trim(),
          description: description?.trim() || null,
          room_type,
          created_by: user.id,
        },
      ])
      .select("*")
      .single();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return NextResponse.json(
        { error: "Failed to create chat room" },
        { status: 500 }
      );
    }

    // Add creator as owner
    const membersToAdd = [
      {
        room_id: room.id,
        user_id: user.id,
        member_role: "owner",
      },
    ];

    // Add other members
    member_ids.forEach((memberId: string) => {
      if (memberId !== user.id) {
        membersToAdd.push({
          room_id: room.id,
          user_id: memberId,
          member_role: "member",
        });
      }
    });

    const { error: membersError } = await tq
      .from("student_chat_members")
      .insert(membersToAdd);

    if (membersError) {
      console.error("Error adding members:", membersError);
      // Clean up the room
      await tq.from("student_chat_rooms").delete().eq("id", room.id);
      return NextResponse.json(
        { error: "Failed to add members to chat room" },
        { status: 500 }
      );
    }

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
