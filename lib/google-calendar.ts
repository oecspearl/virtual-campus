import { google } from 'googleapis';

/**
 * Creates a Google Calendar event with a Google Meet link
 * Returns the Meet link if successful, null otherwise
 */
export async function createGoogleMeetLink(
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  timezone: string = 'America/New_York'
): Promise<string | null> {
  try {
    // Check if Google API credentials are configured
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    if (!clientEmail || !privateKey) {
      console.log('Google Calendar API credentials not configured');
      return null;
    }

    // Create JWT auth client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Create calendar event with Google Meet
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
      calendarId: calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
    });

    // Extract the Meet link from the response
    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (entry: any) => entry.entryPointType === 'video'
    )?.uri;

    if (meetLink) {
      return meetLink;
    }

    // Fallback: try to get link from hangoutLink
    if (response.data.hangoutLink) {
      return response.data.hangoutLink;
    }

    console.error('No Meet link found in calendar event response');
    return null;
  } catch (error) {
    console.error('Error creating Google Meet link via Calendar API:', error);
    return null;
  }
}

/**
 * Check if Google Calendar API is configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

