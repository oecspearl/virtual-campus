import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.SENTRY_DSN;

// Edge runtime (middleware, edge route handlers). Same defaults as the
// Node server config — the SDK splits them because the runtimes have
// different module systems.
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
