// Sentry initialization for the browser bundle.
// Loaded by Next.js (15+) automatically on every client navigation.
// Replaces the legacy sentry.client.config.ts location for Turbopack
// compatibility. https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Gated init: no DSN env var = no Sentry init = silent. Set
// NEXT_PUBLIC_SENTRY_DSN only in Vercel's Production environment so
// preview/dev stay quiet.
//
// Session Replay is intentionally NOT added here. It's the largest
// single Sentry bundle contributor (~100 KB minified) and a material
// chunk of build memory cost. Re-add Sentry.replayIntegration() here
// AND flip the matching `excludeReplay*` flags in next.config.ts back
// to false if a specific debugging session genuinely needs the
// seconds-before-error video.
if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),

    // Capture every error in production.
    sampleRate: 1.0,

    // Performance traces: 10% sampled. 100% sampling on a 10k-student
    // LMS burns the free tier's 10k events/month in hours.
    tracesSampleRate: 0.1,

    // Drop known-noise events (AbortError, expected 4xx, hydration
    // warnings, ResizeObserver loops) before they hit Sentry.
    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },

    // PII off by default — don't ship student emails / IPs / cookies
    // to Sentry. OECS tenants include member states with data-residency
    // posture; explicit Sentry.setUser() calls are still available when
    // we deliberately want a user-tagged event.
    sendDefaultPii: false,
  });
}

// Captures router transitions for performance traces in the App Router.
// This export name is part of the Next.js 15 instrumentation contract.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
