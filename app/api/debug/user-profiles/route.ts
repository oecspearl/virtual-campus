import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    // Authenticate user
    const authResult = await authenticateUser({} as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const supabase = await createServerSupabaseClient();

    // Check if user_profiles table exists by trying to query it
    console.log("Checking user_profiles table structure...");
    
    // Try to get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);

    console.log("Table info result:", { tableInfo, tableError });

    // Try to get all user_profiles for this user
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id);

    console.log("User profiles for current user:", { userProfiles, userProfilesError });

    // Try to get all user_profiles (if admin)
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(5);

    console.log("All user profiles (first 5):", { allProfiles, allProfilesError });

    return NextResponse.json({
      tableExists: !tableError,
      tableError: tableError?.message,
      userProfiles,
      userProfilesError: userProfilesError?.message,
      allProfiles,
      allProfilesError: allProfilesError?.message,
      userId: user.id
    });

  } catch (error) {
    console.error("Debug user_profiles error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Authenticate user
    const authResult = await authenticateUser({} as any);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }

    const { user } = authResult;
    const supabase = await createServerSupabaseClient();

    // Try to create a test record
    const testPayload = {
      user_id: user.id,
      bio: "Test bio",
      avatar: "https://example.com/test.jpg",
      learning_preferences: { test: true },
      updated_at: new Date().toISOString(),
    };

    console.log("Attempting to create test user_profiles record:", testPayload);

    const { data: createResult, error: createError } = await supabase
      .from("user_profiles")
      .insert([testPayload])
      .select("*")
      .single();

    console.log("Create test record result:", { createResult, createError });

    return NextResponse.json({
      success: !createError,
      createResult,
      createError: createError?.message,
      details: createError?.details,
      hint: createError?.hint,
      code: createError?.code
    });

  } catch (error) {
    console.error("Debug user_profiles POST error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
