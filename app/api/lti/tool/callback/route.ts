/**
 * LTI Tool Callback
 * Handles callback from Supabase magic link and redirects to course/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get session from the magic link
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.redirect(new URL('/auth/signin?error=session_failed', request.url));
    }

    // Get the most recent LTI launch for this user
    const { data: launch } = await supabase
      .from('lti_tool_launches')
      .select('redirect_url, launch_presentation_return_url')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Determine redirect URL
    const redirectPath = launch?.redirect_url || '/dashboard';

    // If there's a return URL from the platform, use it
    if (launch?.launch_presentation_return_url) {
      return NextResponse.redirect(launch.launch_presentation_return_url);
    }

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch (error) {
    console.error('[LTI Tool Callback] Error:', error);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}



