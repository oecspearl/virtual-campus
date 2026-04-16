import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notifyRoomMembers } from "@/lib/notifications";

// Maximum file size for attachments (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// GET /api/messages/rooms/[id]/messages - Get messages for a chat room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const before = searchParams.get("before"); // For pagination by timestamp

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

    // Get blocked users to filter messages
    const { data: blockedUsers } = await tq
      .from("student_chat_blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    const blockedIds = (blockedUsers || []).map((b) => b.blocked_id);

    // Build messages query — filter blocked users at DB level
    let query = tq
      .from("student_chat_messages")
      .select(
        `
        *,
        sender:users!student_chat_messages_sender_id_fkey(id, name, email)
      `
      )
      .eq("room_id", roomId)
      .eq("is_deleted", false);

    // Exclude blocked users in the query instead of filtering in JS
    if (blockedIds.length > 0) {
      query = query.not("sender_id", "in", `(${blockedIds.join(",")})`);
    }

    if (before) {
      query = query.lt("created_at", before);
    }

    query = query.order("created_at", { ascending: false });

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(limit);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    const filteredMessages = messages || [];

    // Fetch reply_to data for messages that have replies
    const replyIds = filteredMessages
      .filter((m) => m.reply_to_id)
      .map((m) => m.reply_to_id);

    let replyMap: Record<string, any> = {};
    if (replyIds.length > 0) {
      const { data: replies } = await tq
        .from("student_chat_messages")
        .select("id, content, sender:users!student_chat_messages_sender_id_fkey(id, name)")
        .in("id", replyIds);

      if (replies) {
        replyMap = Object.fromEntries(replies.map((r) => [r.id, r]));
      }
    }

    // Attach reply_to data to messages
    const messagesWithReplies = filteredMessages.map((m) => ({
      ...m,
      reply_to: m.reply_to_id ? replyMap[m.reply_to_id] || null : null,
    }));

    // Reverse to get chronological order
    const chronologicalMessages = messagesWithReplies.reverse();

    return NextResponse.json({
      messages: chronologicalMessages,
      has_more: (messages || []).length === limit,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/rooms/[id]/messages - Send a message
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
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user is a member
    const { data: membership } = await tq
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

    // Parse form data (supports file uploads)
    const contentType = request.headers.get("content-type") || "";
    let content = "";
    let reply_to_id: string | null = null;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      content = (formData.get("content") as string) || "";
      reply_to_id = (formData.get("reply_to_id") as string) || null;
      file = formData.get("file") as File | null;
    } else {
      const body = await request.json();
      content = body.content || "";
      reply_to_id = body.reply_to_id || null;
    }

    // Validate content or file
    if (!content.trim() && !file) {
      return NextResponse.json(
        { error: "Message content or file is required" },
        { status: 400 }
      );
    }

    // Handle file upload if present
    let messageType = "text";
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        );
      }

      // Determine message type
      if (file.type.startsWith("image/")) {
        messageType = "image";
      } else {
        messageType = "file";
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "file";
      const storagePath = `chat-files/${roomId}/${timestamp}-${randomString}.${fileExtension}`;

      // Upload to Supabase Storage
      const supabase = await createServerSupabaseClient();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload file" },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("course-materials")
        .getPublicUrl(storagePath);

      fileUrl = urlData?.publicUrl || null;
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    }

    // Create message
    const { data: message, error: messageError } = await tq
      .from("student_chat_messages")
      .insert([
        {
          room_id: roomId,
          sender_id: user.id,
          content: content.trim() || (file ? `Sent a ${messageType}` : ""),
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          reply_to_id: reply_to_id,
        },
      ])
      .select(
        `
        *,
        sender:users!student_chat_messages_sender_id_fkey(id, name, email)
      `
      )
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Fetch reply_to data separately if exists
    const messageWithReply = { ...message, reply_to: null as any };
    if (reply_to_id) {
      const { data: replyData } = await tq
        .from("student_chat_messages")
        .select("id, content, sender:users!student_chat_messages_sender_id_fkey(id, name)")
        .eq("id", reply_to_id)
        .single();

      if (replyData) {
        messageWithReply.reply_to = replyData;
      }
    }

    // Send notifications to other room members (async, don't block response)
    // Get room info for notification context
    const { data: room } = await tq
      .from("student_chat_rooms")
      .select("name, room_type")
      .eq("id", roomId)
      .single();

    const senderName = message.sender?.name || "Someone";
    const isGroupChat = room?.room_type !== "direct";
    const roomName = room?.name || undefined;
    const messagePreview = content.trim() || (file ? `Sent a ${messageType}` : "");

    // Fire and forget - don't wait for notifications to complete
    notifyRoomMembers(roomId, user.id, senderName, messagePreview, roomName, isGroupChat).catch(
      (err) => console.error("Error sending message notifications:", err)
    );

    return NextResponse.json(messageWithReply, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
