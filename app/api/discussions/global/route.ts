import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// GET /api/discussions/global - Get all global discussions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "recent"; // recent, popular, unanswered
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build query
    let query = tq
      .from("global_discussions")
      .select(
        `
        *,
        category:global_discussion_categories(id, name, slug, icon, color),
        author:users!global_discussions_author_id_fkey(id, name, email),
        replies:global_discussion_replies(count),
        votes:global_discussion_votes(count)
      `,
        { count: "exact" }
      );

    // Filter by category
    if (category && category !== "all") {
      const { data: categoryData } = await tq
        .from("global_discussion_categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (categoryData) {
        query = query.eq("category_id", categoryData.id);
      }
    }

    // Sort options
    switch (sort) {
      case "popular":
        query = query
          .order("is_pinned", { ascending: false })
          .order("vote_count", { ascending: false })
          .order("reply_count", { ascending: false });
        break;
      case "unanswered":
        query = query
          .eq("reply_count", 0)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query
          .order("is_pinned", { ascending: false })
          .order("last_activity_at", { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: discussions, error, count } = await query;

    if (error) {
      console.error("Error fetching global discussions:", error);
      return NextResponse.json(
        { error: "Failed to fetch discussions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      discussions: discussions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Global discussions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/discussions/global - Create a new global discussion
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;

    const body = await request.json();
    const {
      title,
      content,
      category_id,
      is_pinned = false,
      is_locked = false,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Only admins can pin or lock discussions
    const isAdmin = ["admin", "super_admin"].includes(userProfile?.role);
    const finalIsPinned = isAdmin ? is_pinned : false;
    const finalIsLocked = isAdmin ? is_locked : false;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Check category restriction for announcements
    if (category_id) {
      const { data: category } = await tq
        .from("global_discussion_categories")
        .select("slug")
        .eq("id", category_id)
        .single();

      if (category?.slug === "announcements" && !isAdmin) {
        return NextResponse.json(
          { error: "Only administrators can post announcements" },
          { status: 403 }
        );
      }
    }

    const { data: discussion, error } = await tq
      .from("global_discussions")
      .insert([
        {
          title: title.trim(),
          content: content.trim(),
          category_id: category_id || null,
          author_id: user.id,
          is_pinned: finalIsPinned,
          is_locked: finalIsLocked,
        },
      ])
      .select(
        `
        *,
        category:global_discussion_categories(id, name, slug, icon, color),
        author:users!global_discussions_author_id_fkey(id, name, email)
      `
      )
      .single();

    if (error) {
      console.error("Error creating global discussion:", error);
      return NextResponse.json(
        { error: "Failed to create discussion" },
        { status: 500 }
      );
    }

    return NextResponse.json(discussion, { status: 201 });
  } catch (error) {
    console.error("Create global discussion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
