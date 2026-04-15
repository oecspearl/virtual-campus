import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";
import "./styles/custom.css";
import "./styles/accessibility.css";
import "./styles/mobile.css";
import "./styles/rtl.css";
import Navbar from "@/app/components/layout/Navbar";
import LogoHeader from "@/app/components/layout/LogoHeader";
import { Footer } from "@/app/components/layout/Footer";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { HelpProvider } from "@/app/components/help/HelpContext";
import HelpButton from "@/app/components/help/HelpButton";
import AIChatWidget from "@/app/components/ai/AIChatWidget";
import ThemeProvider from "@/app/components/layout/ThemeProvider";
import SkipToContent from "@/app/components/ui/SkipToContent";
import PerformanceTracker from "@/app/components/pwa/PerformanceTracker";
import PWARegistration from "@/app/components/pwa/PWARegistration";
import PWAInstallPrompt from "@/app/components/pwa/PWAInstallPrompt";
import OfflineIndicator from "@/app/components/pwa/OfflineIndicator";
import BottomNavigation from "@/app/components/mobile/BottomNavigation";
import MobileHeader from "@/app/components/mobile/MobileHeader";

const primaryFont = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// RTL languages for future expansion
const rtlLocales = ['ar', 'he', 'fa', 'ur'];

// Viewport configuration (separate export required in Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// OECS Virtual Campus - Learning Management System
export const metadata: Metadata = {
  title: "OECS Virtual Campus",
  description: "OECS Virtual Campus - Empowering education across the Caribbean. Powered by Learnboard.",
  icons: {
    icon: [
      {
        url: '/oecs-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    shortcut: '/oecs-logo.png',
    apple: '/oecs-logo.png',
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
    <html data-editor-id="app/layout.tsx:27:5" lang={locale} dir={dir} className={`${primaryFont.variable} ${displayFont.variable} ${primaryFont.className}`}>
      <head>
        <link rel="icon" type="image/png" href="/oecs-logo.png" />
        <link rel="shortcut icon" href="/oecs-logo.png" />
        <link rel="apple-touch-icon" href="/oecs-logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OECS Virtual Campus" />
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
                className="min-h-[calc(100vh-64px)] has-bottom-nav lg:!pb-0"
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
