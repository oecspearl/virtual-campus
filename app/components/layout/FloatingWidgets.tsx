'use client';

/**
 * Floating widgets that load AFTER the page is interactive.
 *
 * Lives in a client component so we can use `next/dynamic` with
 * `ssr: false` (forbidden in server components on Next 15). The
 * server-component root layout imports this single wrapper, which
 * in turn lazy-loads each widget — keeping their JS off the
 * critical path.
 */

import dynamic from 'next/dynamic';

const AIChatWidget = dynamic(
  () => import('@/app/components/ai/AIChatWidget'),
  { ssr: false }
);
const HelpButton = dynamic(
  () => import('@/app/components/help/HelpButton'),
  { ssr: false }
);
const PWAInstallPrompt = dynamic(
  () => import('@/app/components/pwa/PWAInstallPrompt'),
  { ssr: false }
);
const OfflineIndicator = dynamic(
  () => import('@/app/components/pwa/OfflineIndicator'),
  { ssr: false }
);

export default function FloatingWidgets() {
  return (
    <>
      <HelpButton />
      <AIChatWidget />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
}
