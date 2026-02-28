import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = createServiceSupabaseClient();

    // First, get a real user ID from the users table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({
        error: "No users found in database",
        usersError: usersError?.message
      });
    }

    const testUserId = users[0].id;
    console.log("Using real user ID:", testUserId);
    
    const testPayload = {
      user_id: testUserId,
      bio: "Test bio with service role",
      avatar: "https://example.com/test.jpg",
      learning_preferences: { test: true, method: "service_role" },
      updated_at: new Date().toISOString(),
    };

    console.log("Testing service role insert with payload:", testPayload);

    // Try insert
    const { data: insertResult, error: insertError } = await supabase
      .from("user_profiles")
      .insert([testPayload])
      .select("*")
      .single();

    console.log("Service role insert result:", { insertResult, insertError });

    // Try to read it back
    const { data: readResult, error: readError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", testUserId)
      .single();

    console.log("Service role read result:", { readResult, readError });

    // Clean up
    if (insertResult) {
      await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", testUserId);
      console.log("Cleaned up test record");
    }

    return NextResponse.json({
      insert: {
        success: !insertError,
        result: insertResult,
        error: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
        code: insertError?.code
      },
      read: {
        success: !readError,
        result: readResult,
        error: readError?.message
      },
      testUserId: testUserId
    });

  } catch (error) {
    console.error("Service role test error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
