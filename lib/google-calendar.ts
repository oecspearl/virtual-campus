import { google } from 'googleapis';
import { createServiceSupabaseClient } from './supabase-server';

/**
 * Creates a Google Meet link using OAuth2 (user-consented refresh token).
 *
 * Flow:
 * 1. Admin connects Google account once via /api/auth/google-meet/authorize
 * 2. Refresh token is stored in site_settings
 * 3. This function uses that token to create calendar events with Meet links
 *
 * Required env vars:
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * Required DB setup:
 *   site_settings row with key='google_meet_refresh_token'
 */
export async function createGoogleMeetLink(
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  timezone: string = 'America/New_York'
): Promise<{ link: string } | { error: string }> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { error: 'Google OAuth credentials not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)' };
  }

  // Get the stored refresh token from site_settings
  const supabase = createServiceSupabaseClient();
  const { data: tokenSetting } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'google_meet_refresh_token')
    .single();

  if (!tokenSetting?.setting_value) {
    return { error: 'Google account not connected. An admin must connect their Google account in Admin Settings.' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: tokenSetting.setting_value });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: timezone,
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (entry: any) => entry.entryPointType === 'video'
    )?.uri;

    if (meetLink) {
      console.log('[Google Meet] Successfully created Meet link:', meetLink);
      return { link: meetLink };
    }

    if (response.data.hangoutLink) {
      return { link: response.data.hangoutLink };
    }

    return { error: 'Calendar event created but no Meet link was returned.' };
  } catch (error: any) {
    const message = error?.response?.data?.error?.message
      || error?.errors?.[0]?.message
      || error?.message
      || 'Unknown error';
    const status = error?.response?.status || error?.code;
    console.error(`[Google Meet] Error (${status}):`, message);

    // If token is invalid/expired, suggest re-connecting
    if (status === 401 || status === 403) {
      return { error: `Google authorization expired or invalid. Please re-connect your Google account in Admin Settings. (${message})` };
    }

    return { error: `Google API error (${status}): ${message}` };
  }
}

/**
 * Check if Google Meet auto-generation is configured.
 * Returns true if OAuth credentials exist (actual token check happens at creation time).
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}
