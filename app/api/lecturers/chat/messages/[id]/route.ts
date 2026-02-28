import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// PUT /api/lecturers/chat/messages/[id] - Update a message
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the sender
    const { data: message } = await supabase
      .from("lecturer_messages")
      .select("sender_id, room_id")
      .eq("id", messageId)
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: updatedMessage, error } = await supabase
      .from("lecturer_messages")
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId)
      .select(`
        *,
        sender:users!sender_id(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating message:", error);
      return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Update message API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/lecturers/chat/messages/[id] - Delete a message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    
    if (!hasRole(userProfile?.role, ["instructor", "curriculum_designer", "admin", "super_admin"])) {
      return NextResponse.json({ error: "Access denied. Lecturers only." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is the sender or room admin
    const { data: message } = await supabase
      .from("lecturer_messages")
      .select("sender_id, room_id")
      .eq("id", messageId)
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isSender = message.sender_id === user.id;
    const isAdmin = hasRole(userProfile?.role, ["admin", "super_admin"]);

    // Check if user is room admin
    const { data: membership } = await supabase
      .from("lecturer_chat_room_members")
      .select("role")
      .eq("room_id", message.room_id)
      .eq("user_id", user.id)
      .single();

    const isRoomAdmin = membership?.role === "admin" || membership?.role === "moderator";

    if (!isSender && !isAdmin && !isRoomAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from("lecturer_messages")
      .update({
        is_deleted: true,
        content: "[Message deleted]",
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete message API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

