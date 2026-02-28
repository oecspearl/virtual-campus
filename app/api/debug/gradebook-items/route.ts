import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json({ error: "courseId parameter is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Test 1: Get all items for the course
    const { data: allItems, error: allError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    // Test 2: Get only active items
    const { data: activeItems, error: activeError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // Test 3: Check if the specific student grade item exists
    const { data: specificItem, error: specificError } = await supabase
      .from("course_grade_items")
      .select("*")
      .eq("id", "17d6ab96-8652-465e-8fe2-f7e1e94e157e");

    return NextResponse.json({
      courseId,
      debug: {
        allItemsCount: allItems?.length || 0,
        activeItemsCount: activeItems?.length || 0,
        specificItemExists: specificItem && specificItem.length > 0,
        allError: allError?.message || null,
        activeError: activeError?.message || null,
        specificError: specificError?.message || null
      },
      allItems: allItems || [],
      activeItems: activeItems || [],
      specificItem: specificItem || []
    });

  } catch (e: any) {
    console.error('Debug gradebook items API error:', e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
