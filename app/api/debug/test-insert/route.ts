import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // First, let's get a real user ID from the users table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    console.log("Users from database:", { users, usersError });

    if (!users || users.length === 0) {
      return NextResponse.json({
        error: "No users found in database",
        usersError: usersError?.message
      });
    }

    const realUserId = users[0].id;
    console.log("Using real user ID:", realUserId);

    // Create a test record with real user ID
    const testPayload = {
      user_id: realUserId,
      bio: "Test bio for debugging",
      avatar: "https://example.com/test.jpg",
      learning_preferences: { test: true, style: "visual" },
      updated_at: new Date().toISOString(),
    };

    console.log("Attempting to insert test user_profiles record:", testPayload);

    const { data: insertResult, error: insertError } = await supabase
      .from("user_profiles")
      .insert([testPayload])
      .select("*")
      .single();

    console.log("Insert test record result:", { insertResult, insertError });

    // Now try to upsert the same record
    const upsertPayload = {
      ...testPayload,
      bio: "Updated test bio",
    };

    console.log("Attempting to upsert test user_profiles record:", upsertPayload);

    const { data: upsertResult, error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("*")
      .single();

    console.log("Upsert test record result:", { upsertResult, upsertError });

    return NextResponse.json({
      insert: {
        success: !insertError,
        result: insertResult,
        error: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
        code: insertError?.code
      },
      upsert: {
        success: !upsertError,
        result: upsertResult,
        error: upsertError?.message,
        details: upsertError?.details,
        hint: upsertError?.hint,
        code: upsertError?.code
      }
    });

  } catch (error) {
    console.error("Debug test insert error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
