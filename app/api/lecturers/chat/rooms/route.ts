import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/chat/rooms - Get all chat rooms user is a member of
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    // Get rooms where user is a member
    // RLS policy should automatically filter to only rooms where user is a member
    const { data: rooms, error } = await supabase
      .from("lecturer_chat_rooms")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chat rooms:", error);
      console.error("Chat rooms error details:", JSON.stringify(error, null, 2));
      console.error("User ID:", user.id);
      return NextResponse.json({ 
        error: "Failed to fetch chat rooms",
        details: error.message,
        code: error.code,
        hint: error.code === 'PGRST301' ? "RLS policy might be blocking access. Check if user is a member of any rooms." : "Check if lecturer_chat_rooms table exists and RLS policies are correct"
      }, { status: 500 });
    }

    // If no rooms, return empty array (user might not be a member of any rooms yet)
    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    // Get members for each room
    const roomIds = rooms.map((r: any) => r.id);
    const { data: allMembers, error: membersError } = await supabase
      .from("lecturer_chat_room_members")
      .select(`
        room_id,
        user_id,
        role,
        last_read_at,
        user:users!user_id(id, name, email)
      `)
      .in("room_id", roomIds);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      console.error("Members error details:", JSON.stringify(membersError, null, 2));
      // Don't fail, just return rooms without members
    }

    // Group members by room_id
    const membersByRoom = new Map();
    (allMembers || []).forEach((member: any) => {
      if (!membersByRoom.has(member.room_id)) {
        membersByRoom.set(member.room_id, []);
      }
      membersByRoom.get(member.room_id).push(member);
    });

    // Attach members to rooms
    const roomsWithMembers = rooms.map((room: any) => ({
      ...room,
      members: membersByRoom.get(room.id) || []
    }));

    return NextResponse.json({ rooms: roomsWithMembers });
  } catch (error: any) {
    console.error("Chat rooms API error:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error?.message || "Unknown error",
      hint: "Check server logs and verify database schema is applied"
    }, { status: 500 });
  }
}

// POST /api/lecturers/chat/rooms - Create a new chat room
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, room_type = "group", subject_area, member_ids } = body;

    if (!name) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Create room
    const { data: room, error: roomError } = await supabase
      .from("lecturer_chat_rooms")
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        room_type,
        subject_area: subject_area || null,
        created_by: user.id
      }])
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .single();

    if (roomError || !room) {
      console.error("Error creating room:", roomError);
      return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
    }

    // Add creator as admin member
    await supabase
      .from("lecturer_chat_room_members")
      .insert([{
        room_id: room.id,
        user_id: user.id,
        role: "admin"
      }]);

    // Add other members if provided
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const membersToAdd = member_ids
        .filter((id: string) => id !== user.id) // Don't add creator again
        .map((id: string) => ({
          room_id: room.id,
          user_id: id,
          role: "member"
        }));

      if (membersToAdd.length > 0) {
        await supabase
          .from("lecturer_chat_room_members")
          .insert(membersToAdd);
      }
    }

    // Fetch complete room data with members
    const { data: completeRoom } = await supabase
      .from("lecturer_chat_rooms")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email),
        members:lecturer_chat_room_members(
          user_id,
          role,
          user:users!user_id(id, name, email)
        )
      `)
      .eq("id", room.id)
      .single();

    return NextResponse.json({ room: completeRoom }, { status: 201 });
  } catch (error) {
    console.error("Create chat room API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

