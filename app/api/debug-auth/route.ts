import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: userError?.message || 'No user found' 
      });
    }

    // Check user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      profile: userProfile,
      profileError: profileError?.message
    });

  } catch (error: any) {
    return NextResponse.json({ 
      authenticated: false, 
      error: error.message 
    });
  }
}
