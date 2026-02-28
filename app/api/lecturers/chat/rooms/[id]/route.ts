import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/chat/rooms/[id] - Get a specific chat room
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from("lecturer_chat_room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied. Not a member of this room." }, { status: 403 });
    }

    // Get room details
    const { data: room, error } = await supabase
      .from("lecturer_chat_rooms")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email),
        members:lecturer_chat_room_members(
          user_id,
          role,
          joined_at,
          last_read_at,
          user:users!user_id(id, name, email)
        )
      `)
      .eq("id", roomId)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Get chat room API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/lecturers/chat/rooms/[id] - Update a chat room
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is admin or creator
    const { data: room } = await supabase
      .from("lecturer_chat_rooms")
      .select("created_by")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("lecturer_chat_room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    const isRoomAdmin = membership?.role === "admin" || membership?.role === "moderator";
    const isCreator = room.created_by === user.id;

    if (!isAdmin && !isRoomAdmin && !isCreator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, subject_area } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (subject_area !== undefined) updateData.subject_area = subject_area || null;

    const { data: updatedRoom, error } = await supabase
      .from("lecturer_chat_rooms")
      .update(updateData)
      .eq("id", roomId)
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating room:", error);
      return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Update chat room API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/chat/rooms/[id] - Delete a chat room
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is creator or admin
    const { data: room } = await supabase
      .from("lecturer_chat_rooms")
      .select("created_by")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    if (room.created_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await supabase
      .from("lecturer_chat_rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      console.error("Error deleting room:", error);
      return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat room API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

