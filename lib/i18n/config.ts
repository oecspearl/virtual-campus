// Internationalization configuration for OECS LearnBoard

export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// RTL languages (for future expansion)
export const rtlLocales: Locale[] = [];

// Language names for display
export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

// Locale detection order
export const localeDetection = {
  // 1. Check URL path
  // 2. Check user preference (stored in database)
  // 3. Check browser Accept-Language header
  // 4. Fall back to default
  order: ['path', 'cookie', 'header'] as const,
  cookieName: 'NEXT_LOCALE',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
