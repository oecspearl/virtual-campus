import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createTenantQuery, getTenantIdFromRequest } from '@/lib/tenant-query';

// Supported locales
const SUPPORTED_LOCALES = ['en', 'es', 'fr'];
const DEFAULT_LOCALE = 'en';

/**
 * GET /api/i18n/locale
 * Get the current user's locale preference
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user } } = await tq.raw.auth.getUser();

    // If user is authenticated, get their locale from the database
    if (user) {
      const { data: userData, error } = await tq.from('users')
        .select('locale, timezone')
        .eq('id', user.id)
        .single();

      if (!error && userData) {
        return NextResponse.json({
          locale: userData.locale || DEFAULT_LOCALE,
          timezone: userData.timezone || 'America/New_York',
          source: 'database',
        });
      }
    }

    // Fall back to cookie
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

    if (localeCookie && SUPPORTED_LOCALES.includes(localeCookie)) {
      return NextResponse.json({
        locale: localeCookie,
        timezone: 'America/New_York',
        source: 'cookie',
      });
    }

    // Fall back to Accept-Language header
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [code] = lang.trim().split(';');
          return code.split('-')[0];
        });

      for (const lang of languages) {
        if (SUPPORTED_LOCALES.includes(lang)) {
          return NextResponse.json({
            locale: lang,
            timezone: 'America/New_York',
            source: 'header',
          });
        }
      }
    }

    // Default
    return NextResponse.json({
      locale: DEFAULT_LOCALE,
      timezone: 'America/New_York',
      source: 'default',
    });

  } catch (error) {
    console.error('Error getting locale:', error);
    return NextResponse.json(
      { error: 'Failed to get locale' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/i18n/locale
 * Update the user's locale preference
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, timezone } = body;

    // Validate locale
    if (locale && !SUPPORTED_LOCALES.includes(locale)) {
      return NextResponse.json(
        { error: `Invalid locale. Supported locales: ${SUPPORTED_LOCALES.join(', ')}` },
        { status: 400 }
      );
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);
    const { data: { user } } = await tq.raw.auth.getUser();

    // Set cookie for locale (works for both authenticated and unauthenticated users)
    const cookieStore = await cookies();

    if (locale) {
      cookieStore.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // If user is authenticated, also save to database
    if (user) {
      const updateData: Record<string, string> = {};
      if (locale) updateData.locale = locale;
      if (timezone) updateData.timezone = timezone;

      if (Object.keys(updateData).length > 0) {
        const { error } = await tq.from('users')
          .update(updateData)
          .eq('id', user.id);

        if (error) {
          console.error('Error updating user locale:', error);
          // Don't fail the request, cookie is already set
        }
      }

      return NextResponse.json({
        success: true,
        locale: locale || DEFAULT_LOCALE,
        timezone: timezone || 'America/New_York',
        savedToDatabase: true,
      });
    }

    return NextResponse.json({
      success: true,
      locale: locale || DEFAULT_LOCALE,
      timezone: timezone,
      savedToDatabase: false,
    });

  } catch (error) {
    console.error('Error updating locale:', error);
    return NextResponse.json(
      { error: 'Failed to update locale' },
      { status: 500 }
    );
  }
}
