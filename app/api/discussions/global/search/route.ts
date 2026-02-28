import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";

// GET /api/discussions/global/search - Search discussions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build search query
    // Using ilike for simple pattern matching (full-text search requires more setup)
    let searchQuery = tq
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
      )
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    // Filter by category if provided
    if (category && category !== "all") {
      const { data: categoryData } = await tq
        .from("global_discussion_categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (categoryData) {
        searchQuery = searchQuery.eq("category_id", categoryData.id);
      }
    }

    // Order by relevance (pinned first, then by activity)
    searchQuery = searchQuery
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: discussions, error, count } = await searchQuery;

    if (error) {
      console.error("Error searching discussions:", error);
      return NextResponse.json(
        { error: "Failed to search discussions" },
        { status: 500 }
      );
    }

    // Also search in replies for matching content
    const { data: matchingReplies } = await tq
      .from("global_discussion_replies")
      .select(
        `
        discussion_id,
        global_discussions!inner(
          id,
          title,
          category:global_discussion_categories(id, name, slug, icon, color),
          author:users!global_discussions_author_id_fkey(id, name, email)
        )
      `
      )
      .ilike("content", `%${query}%`)
      .eq("is_hidden", false)
      .limit(10);

    // Get unique discussion IDs from reply matches that aren't in main results
    const mainResultIds = new Set((discussions || []).map((d) => d.id));
    const replyMatchDiscussionIds = [
      ...new Set(
        (matchingReplies || [])
          .map((r) => r.discussion_id)
          .filter((id) => !mainResultIds.has(id))
      ),
    ];

    return NextResponse.json({
      discussions: discussions || [],
      reply_matches: replyMatchDiscussionIds.length,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      query,
    });
  } catch (error) {
    console.error("Search discussions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
