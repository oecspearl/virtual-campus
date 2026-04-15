import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const hasCredentials = isGoogleCalendarConfigured();

    // Check if a refresh token has been stored (admin connected their Google account)
    let connected = false;
    if (hasCredentials) {
      const supabase = createServiceSupabaseClient();
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'google_meet_refresh_token')
        .single();
      connected = !!data?.setting_value;
    }

    return NextResponse.json({
      configured: hasCredentials,
      connected,
    });
  } catch (error) {
    console.error('Error checking Google Meet config:', error);
    return NextResponse.json({ configured: false, connected: false });
  }
}
