import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/messages/blocked - Get blocked users
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

    const { data: blockedUsers, error } = await tq
      .from("student_chat_blocked_users")
      .select(
        `
        id,
        blocked_id,
        reason,
        created_at,
        blocked_user:users!student_chat_blocked_users_blocked_id_fkey(id, name, email)
      `
      )
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching blocked users:", error);
      return NextResponse.json(
        { error: "Failed to fetch blocked users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ blocked_users: blockedUsers || [] });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/blocked - Block a user
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;

    const body = await request.json();
    const { user_id, reason } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check if user exists
    const { data: targetUser, error: userError } = await tq
      .from("users")
      .select("id, name")
      .eq("id", user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already blocked
    const { data: existing } = await tq
      .from("student_chat_blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", user_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "User is already blocked" },
        { status: 400 }
      );
    }

    // Block the user
    const { data: blocked, error: blockError } = await tq
      .from("student_chat_blocked_users")
      .insert([
        {
          blocker_id: user.id,
          blocked_id: user_id,
          reason: reason?.trim() || null,
        },
      ])
      .select(
        `
        id,
        blocked_id,
        reason,
        created_at,
        blocked_user:users!student_chat_blocked_users_blocked_id_fkey(id, name, email)
      `
      )
      .single();

    if (blockError) {
      console.error("Error blocking user:", blockError);
      return NextResponse.json(
        { error: "Failed to block user" },
        { status: 500 }
      );
    }

    return NextResponse.json(blocked, { status: 201 });
  } catch (error) {
    console.error("Block user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
