import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

/**
 * Handles the Google OAuth2 callback after user consents.
 * Exchanges the auth code for tokens and stores the refresh token
 * in site_settings so it can be reused for creating Meet links.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');
    const error = searchParams.get('error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=error&reason=${error}`);
    }

    if (!code || !userId) {
      return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=error&reason=missing_code`);
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=error&reason=missing_config`);
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${appUrl}/api/auth/google-meet/callback`
    );

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('No refresh token received. User may have already authorized before.');
      return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=error&reason=no_refresh_token`);
    }

    // Store refresh token in site_settings
    const supabase = createServiceSupabaseClient();

    // Upsert the refresh token
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('setting_key', 'google_meet_refresh_token')
      .single();

    if (existing) {
      await supabase
        .from('site_settings')
        .update({ setting_value: tokens.refresh_token, updated_at: new Date().toISOString() })
        .eq('setting_key', 'google_meet_refresh_token');
    } else {
      await supabase
        .from('site_settings')
        .insert({
          setting_key: 'google_meet_refresh_token',
          setting_value: tokens.refresh_token,
          description: 'Google OAuth2 refresh token for auto-generating Meet links',
        });
    }

    // Also store which user connected it
    const { data: existingUser } = await supabase
      .from('site_settings')
      .select('id')
      .eq('setting_key', 'google_meet_connected_by')
      .single();

    if (existingUser) {
      await supabase
        .from('site_settings')
        .update({ setting_value: userId, updated_at: new Date().toISOString() })
        .eq('setting_key', 'google_meet_connected_by');
    } else {
      await supabase
        .from('site_settings')
        .insert({
          setting_key: 'google_meet_connected_by',
          setting_value: userId,
          description: 'User ID who connected Google Meet',
        });
    }

    console.log('[Google Meet] OAuth tokens saved successfully for user:', userId);
    return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=success`);
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error?.message || error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(`${appUrl}/admin/settings?google_meet=error&reason=token_exchange_failed`);
  }
}
