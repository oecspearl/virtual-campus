import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check RLS status on both tables
    const { data: usersRLS, error: usersRLSError } = await supabase
      .rpc('check_rls_enabled', { table_name: 'users' })
      .single();

    const { data: profilesRLS, error: profilesRLSError } = await supabase
      .rpc('check_rls_enabled', { table_name: 'user_profiles' })
      .single();

    // Try to get table policies
    const { data: usersPolicies, error: usersPoliciesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users');

    const { data: profilesPolicies, error: profilesPoliciesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_profiles');

    // Check if we can bypass RLS with service role
    const serviceSupabase = await createServerSupabaseClient();
    
    const { data: serviceUsers, error: serviceUsersError } = await serviceSupabase
      .from("users")
      .select("id, email, name, role")
      .limit(3);

    const { data: serviceProfiles, error: serviceProfilesError } = await serviceSupabase
      .from("user_profiles")
      .select("user_id, bio, avatar")
      .limit(3);

    return NextResponse.json({
      rls_status: {
        users: {
          enabled: usersRLS,
          error: usersRLSError?.message
        },
        user_profiles: {
          enabled: profilesRLS,
          error: profilesRLSError?.message
        }
      },
      policies: {
        users: {
          data: usersPolicies,
          error: usersPoliciesError?.message
        },
        user_profiles: {
          data: profilesPolicies,
          error: profilesPoliciesError?.message
        }
      },
      service_role_access: {
        users: {
          data: serviceUsers,
          error: serviceUsersError?.message,
          count: serviceUsers?.length || 0
        },
        user_profiles: {
          data: serviceProfiles,
          error: serviceProfilesError?.message,
          count: serviceProfiles?.length || 0
        }
      },
      recommendations: [
        "If RLS is enabled, ensure policies allow authenticated users to insert/update their own records",
        "Check if user_profiles table has INSERT policy for authenticated users",
        "Verify that user_id matches the authenticated user's ID",
        "Consider using service role for admin operations if needed"
      ]
    });

  } catch (error) {
    console.error("RLS check error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
