import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api-auth';
import { google } from 'googleapis';

/**
 * Initiates Google OAuth2 flow for Meet/Calendar access.
 * Admin clicks "Connect Google Account" → redirected to Google consent screen →
 * Google redirects back to /api/auth/google-meet/callback with auth code.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: 'Google OAuth credentials not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${appUrl}/api/auth/google-meet/callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: authResult.user.id,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate Google authorization' }, { status: 500 });
  }
}
