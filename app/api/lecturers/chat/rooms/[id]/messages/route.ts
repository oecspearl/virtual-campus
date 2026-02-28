import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/rbac";

// GET /api/lecturers/chat/rooms/[id]/messages - Get messages for a room
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const before = searchParams.get("before"); // Message ID to fetch messages before

    let query = supabase
      .from("lecturer_messages")
      .select(`
        *,
        sender:users!sender_id(id, name, email),
        reply_to:lecturer_messages!reply_to_id(id, content, sender:users!sender_id(id, name))
      `)
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      // Get messages before a specific message
      const { data: beforeMessage } = await supabase
        .from("lecturer_messages")
        .select("created_at")
        .eq("id", before)
        .single();

      if (beforeMessage) {
        query = query.lt("created_at", beforeMessage.created_at);
      }
    } else {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Update last_read_at for user
    await supabase
      .from("lecturer_chat_room_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    // Reverse to show oldest first (for display)
    const sortedMessages = (messages || []).reverse();

    return NextResponse.json({ messages: sortedMessages });
  } catch (error) {
    console.error("Get messages API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/lecturers/chat/rooms/[id]/messages - Send a message
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

    const supabase = await createServerSupabaseClient();

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

    const formData = await request.formData();
    const content = formData.get("content") as string;
    const reply_to_id = formData.get("reply_to_id") as string | null;
    const file = formData.get("file") as File | null;

    if (!content && !file) {
      return NextResponse.json({ error: "Content or file is required" }, { status: 400 });
    }

    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    let fileSize = null;

    // Handle file upload if present
    if (file) {
      const maxBytes = 50 * 1024 * 1024; // 50MB
      if (file.size > maxBytes) {
        return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const storageFileName = `lecturer-chat/${roomId}/${timestamp}-${randomString}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(storageFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return NextResponse.json({ error: "File upload failed" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('course-materials')
        .getPublicUrl(storageFileName);

      fileUrl = urlData.publicUrl;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    const { data: message, error } = await supabase
      .from("lecturer_messages")
      .insert([{
        room_id: roomId,
        sender_id: user.id,
        content: content?.trim() || "",
        message_type: file ? "file" : "text",
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        reply_to_id: reply_to_id || null
      }])
      .select(`
        *,
        sender:users!sender_id(id, name, email),
        reply_to:lecturer_messages!reply_to_id(id, content, sender:users!sender_id(id, name))
      `)
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Send message API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

