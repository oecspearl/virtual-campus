import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";
import "./styles/custom.css";
import "./styles/accessibility.css";
import "./styles/mobile.css";
import "./styles/rtl.css";
import Navbar from "@/app/components/Navbar";
import LogoHeader from "@/app/components/LogoHeader";
import { Footer } from "@/app/components/Footer";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { HelpProvider } from "@/app/components/HelpContext";
import HelpButton from "@/app/components/HelpButton";
import AIChatWidget from "@/app/components/AIChatWidget";
import ThemeProvider from "@/app/components/ThemeProvider";
import SkipToContent from "@/app/components/SkipToContent";
import PerformanceTracker from "@/app/components/PerformanceTracker";
import PWARegistration from "@/app/components/PWARegistration";
import PWAInstallPrompt from "@/app/components/PWAInstallPrompt";
import OfflineIndicator from "@/app/components/OfflineIndicator";
import BottomNavigation from "@/app/components/mobile/BottomNavigation";
import MobileHeader from "@/app/components/mobile/MobileHeader";

const primaryFont = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"]
});

// RTL languages for future expansion
const rtlLocales = ['ar', 'he', 'fa', 'ur'];

// Viewport configuration (separate export required in Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// OECS MyPD - Learning Management System
export const metadata: Metadata = {
  title: "OECS MyPD",
  description: "OECS Learning Management System - Empowering education across the Caribbean",
  icons: {
    icon: [
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode; }>) {
  // Get the current locale and messages for i18n
  const locale = await getLocale();
  const messages = await getMessages();

  // Determine text direction based on locale
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html data-editor-id="app/layout.tsx:27:5" lang={locale} dir={dir} className={primaryFont.className}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OECS MyPD" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body data-editor-id="app/layout.tsx:31:7" className="antialiased" suppressHydrationWarning={true}>
        <NextIntlClientProvider messages={messages}>
          <SupabaseProvider>
            <HelpProvider>
              <SkipToContent />
              <ThemeProvider />
              <div className="hidden lg:block">
                <Navbar />
              </div>
              <MobileHeader />
              <LogoHeader />
              <main
                id="main-content"
                data-editor-id="app/layout.tsx:33:11"
                className="min-h-[calc(100vh-64px)] pb-16 lg:pb-0"
                tabIndex={-1}
              >
                {children}
              </main>
              <Footer />
              <BottomNavigation />
              <HelpButton />
              <AIChatWidget />
              <PerformanceTracker />
              <PWARegistration />
              <PWAInstallPrompt />
              <OfflineIndicator />
            </HelpProvider>
          </SupabaseProvider>
        </NextIntlClientProvider>
        {process.env.VISUAL_EDITOR_ACTIVE === 'true' &&
          <script data-editor-id="app/layout.tsx:50:9" src="/editor.js" async />
        }
      </body>
    </html>);
}
