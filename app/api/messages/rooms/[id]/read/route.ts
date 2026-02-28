import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// POST /api/messages/rooms/[id]/read - Mark messages as read
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

    // Get the latest message ID (optional)
    const body = await request.json().catch(() => ({}));
    const { message_id } = body;

    // Update the membership with last read time
    // The trigger will automatically reset unread_count
    const { data: membership, error } = await tq
      .from("student_chat_members")
      .update({
        last_read_at: new Date().toISOString(),
        last_read_message_id: message_id || null,
        unread_count: 0,
      })
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .select("id, last_read_at, unread_count")
      .single();

    if (error) {
      console.error("Error marking as read:", error);
      return NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      last_read_at: membership?.last_read_at,
      unread_count: 0,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
