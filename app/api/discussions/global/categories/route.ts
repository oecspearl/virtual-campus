import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";

// GET /api/discussions/global/categories - Get all discussion categories
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const { data: categories, error } = await tq
      .from("global_discussion_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Get discussion counts for each category
    const { data: discussionCounts } = await tq
      .from("global_discussions")
      .select("category_id")
      .not("category_id", "is", null);

    // Count discussions per category
    const countMap = new Map<string, number>();
    (discussionCounts || []).forEach((d) => {
      const count = countMap.get(d.category_id) || 0;
      countMap.set(d.category_id, count + 1);
    });

    // Add counts to categories
    const categoriesWithCounts = (categories || []).map((category) => ({
      ...category,
      discussion_count: countMap.get(category.id) || 0,
    }));

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
