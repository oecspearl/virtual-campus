// Sentry initialization for the edge runtime (middleware + edge routes).
// Loaded by instrumentation.ts on every edge runtime startup.
// Note: this config is also required when running locally, not only on Vercel.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.SENTRY_DSN;

// Gated init: no DSN env var = no Sentry init = silent. Same DSN as the
// Node config — both runtimes report to the same Sentry project.
if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },
    sendDefaultPii: false,
  });
}
