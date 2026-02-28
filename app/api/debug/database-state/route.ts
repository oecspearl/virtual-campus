import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get users count and sample data
    const { count: usersCount, error: usersCountError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .limit(5);

    // Get user_profiles count and sample data
    const { count: profilesCount, error: profilesCountError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    const { data: profilesData, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, bio, avatar, learning_preferences, updated_at")
      .limit(5);

    // Check if we can insert a test record
    const testUserId = "00000000-0000-0000-0000-000000000001"; // Valid UUID format
    const testPayload = {
      user_id: testUserId,
      bio: "Test bio",
      avatar: "https://example.com/test.jpg",
      learning_preferences: { test: true },
      updated_at: new Date().toISOString(),
    };

    const { data: testInsert, error: testInsertError } = await supabase
      .from("user_profiles")
      .insert([testPayload])
      .select("*")
      .single();

    // Clean up test record
    if (testInsert) {
      await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", testUserId);
    }

    return NextResponse.json({
      users: {
        count: usersCount,
        countError: usersCountError?.message,
        data: usersData,
        dataError: usersError?.message,
        sampleIds: usersData?.map(u => u.id) || []
      },
      user_profiles: {
        count: profilesCount,
        countError: profilesCountError?.message,
        data: profilesData,
        dataError: profilesError?.message,
        sampleUserIds: profilesData?.map(p => p.user_id) || []
      },
      testInsert: {
        success: !testInsertError,
        data: testInsert,
        error: testInsertError?.message,
        details: testInsertError?.details,
        hint: testInsertError?.hint,
        code: testInsertError?.code
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Database state check error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
