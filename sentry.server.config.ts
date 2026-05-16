// Sentry initialization for Node.js server routes and server components.
// Loaded by instrumentation.ts on every Node runtime startup.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.SENTRY_DSN;

// Gated init: no DSN env var = no Sentry init = silent. Set SENTRY_DSN only
// in Vercel's Production environment so preview/dev stay quiet.
if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),

    // Capture every error in production.
    sampleRate: 1.0,

    // Performance traces: 10% sampled. At 1.0 a single LMS session burns
    // through the free tier's 10k events/month in hours.
    tracesSampleRate: 0.1,

    // Drop known-noise events (AbortError, expected 4xx, hydration warnings)
    // before they hit Sentry. See lib/sentry-shared.ts for the full list.
    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },

    // PII off by default — don't ship student emails / IPs / cookies to
    // Sentry. Tenants include OECS member states with data-residency
    // concerns; explicit setUser/setTag calls are still allowed when
    // we deliberately want a user-tagged event.
    sendDefaultPii: false,
  });
}
