import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function POST() {
  try {
    // Authenticate user first
    const authResult = await authenticateUser({} as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user, userProfile } = authResult;
    const supabase = await createServerSupabaseClient();

    console.log("Authenticated user:", { id: user.id, email: user.email });
    console.log("User profile from users table:", userProfile);

    // Try to insert into user_profiles with the authenticated user's ID
    const testPayload = {
      user_id: user.id,
      bio: "Test bio from authenticated user",
      avatar: "https://example.com/test.jpg",
      learning_preferences: { test: true, style: "visual" },
      updated_at: new Date().toISOString(),
    };

    console.log("Attempting to insert user_profiles with payload:", testPayload);

    const { data: insertResult, error: insertError } = await supabase
      .from("user_profiles")
      .insert([testPayload])
      .select("*")
      .single();

    console.log("Insert result:", { insertResult, insertError });

    // Try to fetch existing user_profiles for this user
    const { data: existingProfiles, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id);

    console.log("Existing profiles for user:", { existingProfiles, fetchError });

    // Try to upsert instead of insert
    const upsertPayload = {
      ...testPayload,
      bio: "Updated test bio via upsert",
    };

    console.log("Attempting to upsert user_profiles with payload:", upsertPayload);

    const { data: upsertResult, error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("*")
      .single();

    console.log("Upsert result:", { upsertResult, upsertError });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      userProfile: userProfile,
      insert: {
        success: !insertError,
        result: insertResult,
        error: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
        code: insertError?.code
      },
      fetch: {
        success: !fetchError,
        data: existingProfiles,
        error: fetchError?.message
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
    console.error("Test profile insert error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
