import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/chat/rooms/[id]/members - Get room members
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
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied. Not a member of this room." }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from("lecturer_chat_room_members")
      .select(`
        *,
        user:users!user_id(id, name, email)
      `)
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error("Get members API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/chat/rooms/[id]/members - Add members to room
export async function POST(
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

    const body = await request.json();
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: "user_ids array is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from("lecturer_chat_room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    const { data: room } = await supabase
      .from("lecturer_chat_rooms")
      .select("created_by")
      .eq("id", roomId)
      .single();

    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    const isRoomAdmin = membership?.role === "admin" || membership?.role === "moderator";
    const isCreator = room?.created_by === user.id;

    if (!isAdmin && !isRoomAdmin && !isCreator) {
      return NextResponse.json({ error: "Access denied. Only admins can add members." }, { status: 403 });
    }

    // Verify all user_ids are lecturers
    const { data: users } = await supabase
      .from("users")
      .select("id, role")
      .in("id", user_ids)
      .in("role", ["instructor", "curriculum_designer", "admin", "super_admin"]);

    if (!users || users.length !== user_ids.length) {
      return NextResponse.json({ error: "Some users are not lecturers or do not exist" }, { status: 400 });
    }

    // Check which users are already members
    const { data: existingMembers } = await supabase
      .from("lecturer_chat_room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .in("user_id", user_ids);

    const existingUserIds = (existingMembers || []).map((m: any) => m.user_id);
    const newUserIds = user_ids.filter((id: string) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: "All users are already members" }, { status: 400 });
    }

    // Add new members
    const membersToAdd = newUserIds.map((userId: string) => ({
      room_id: roomId,
      user_id: userId,
      role: "member"
    }));

    const { error: insertError } = await supabase
      .from("lecturer_chat_room_members")
      .insert(membersToAdd);

    if (insertError) {
      console.error("Error adding members:", insertError);
      return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      added: newUserIds.length,
      already_members: existingUserIds.length
    });
  } catch (error) {
    console.error("Add members API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/chat/rooms/[id]/members - Remove member from room
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

    const { searchParams } = new URL(request.url);
    const memberUserId = searchParams.get("user_id");

    if (!memberUserId) {
      return NextResponse.json({ error: "user_id query parameter is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Users can remove themselves, or admins can remove anyone
    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);
    const isSelf = memberUserId === user.id;

    if (!isAdmin && !isSelf) {
      // Check if user is room admin trying to remove a member
      const { data: membership } = await supabase
        .from("lecturer_chat_room_members")
        .select("role")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .single();

      const isRoomAdmin = membership?.role === "admin" || membership?.role === "moderator";
      
      if (!isRoomAdmin) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("lecturer_chat_room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", memberUserId);

    if (error) {
      console.error("Error removing member:", error);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

