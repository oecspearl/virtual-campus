import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/rooms/[id] - Get a specific chat room
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
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is a member
    const { data: membership } = await tq
      .from("student_chat_members")
      .select("member_role, is_muted, unread_count, last_read_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this chat room" },
        { status: 403 }
      );
    }

    // Get room details
    const { data: room, error: roomError } = await tq
      .from("student_chat_rooms")
      .select(
        `
        *,
        created_by_user:users!student_chat_rooms_created_by_fkey(id, name, email)
      `
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Chat room not found" },
        { status: 404 }
      );
    }

    // Get all members
    const { data: members } = await tq
      .from("student_chat_members")
      .select(
        `
        user_id,
        member_role,
        joined_at,
        user:users!student_chat_members_user_id_fkey(id, name, email)
      `
      )
      .eq("room_id", roomId);

    // For direct messages, get the other person's name as display name
    let displayName = room.name;
    if (room.room_type === "direct" && members && members.length === 2) {
      const otherMember = members.find((m) => m.user_id !== user.id);
      displayName = (otherMember?.user as any)?.name || "Unknown User";
    }

    return NextResponse.json({
      room: {
        ...room,
        display_name: displayName,
        members,
        my_role: membership.member_role,
        is_muted: membership.is_muted,
        unread_count: membership.unread_count,
        last_read_at: membership.last_read_at,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/messages/rooms/[id] - Update a chat room
export async function PUT(
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
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is admin/owner
    const { data: membership } = await tq
      .from("student_chat_members")
      .select("member_role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.member_role)) {
      return NextResponse.json(
        { error: "Only room admins can update the room" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, avatar_url, is_archived } = body;

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (is_archived !== undefined) updates.is_archived = is_archived;

    const { data: room, error: updateError } = await tq
      .from("student_chat_rooms")
      .update(updates)
      .eq("id", roomId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating room:", updateError);
      return NextResponse.json(
        { error: "Failed to update chat room" },
        { status: 500 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Update room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/rooms/[id] - Delete a chat room
export async function DELETE(
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

    const { user, userProfile } = authResult;
    const isAdmin = ["admin", "super_admin"].includes(userProfile?.role);
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is room owner
    const { data: room } = await tq
      .from("student_chat_rooms")
      .select("created_by")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: "Chat room not found" },
        { status: 404 }
      );
    }

    if (room.created_by !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Only the room creator can delete the room" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await tq
      .from("student_chat_rooms")
      .delete()
      .eq("id", roomId);

    if (deleteError) {
      console.error("Error deleting room:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete chat room" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
