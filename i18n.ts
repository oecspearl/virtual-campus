import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

// Supported locales
export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  let locale: Locale = defaultLocale;

  if (localeCookie && isValidLocale(localeCookie)) {
    locale = localeCookie;
  } else {
    // Fall back to Accept-Language header
    const headerStore = await headers();
    const acceptLanguage = headerStore.get('accept-language');

    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [code, q] = lang.trim().split(';q=');
          return { code: code.split('-')[0], q: q ? parseFloat(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);

      // Find first matching locale
      for (const { code } of languages) {
        if (isValidLocale(code)) {
          locale = code;
          break;
        }
      }
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
