import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user_profiles table exists by trying to query it
    console.log("Checking user_profiles table structure...");
    
    // Try to get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);

    console.log("Table info result:", { tableInfo, tableError });

    // Try to get all user_profiles
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(5);

    console.log("All user profiles (first 5):", { allProfiles, allProfilesError });

    // Check if users table exists
    const { data: usersInfo, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(1);

    console.log("Users table info:", { usersInfo, usersError });

    return NextResponse.json({
      user_profiles: {
        exists: !tableError,
        error: tableError?.message,
        details: tableError?.details,
        hint: tableError?.hint,
        code: tableError?.code,
        sampleData: tableInfo
      },
      all_user_profiles: {
        count: allProfiles?.length || 0,
        error: allProfilesError?.message,
        data: allProfiles
      },
      users_table: {
        exists: !usersError,
        error: usersError?.message,
        sampleData: usersInfo
      }
    });

  } catch (error) {
    console.error("Debug table check error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
