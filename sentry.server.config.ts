import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),

    // Capture every error in production; sample down if quota becomes a concern.
    sampleRate: 1.0,

    // Performance: 10% of transactions get full tracing.
    // Drop to 0.01 if quota is tight, raise if you need more visibility.
    tracesSampleRate: 0.1,

    // Drop known noise before it hits Sentry.
    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },

    // PII off by default — we don't want emails / names landing in Sentry
    // unless we explicitly attach them via setUser/setTag.
    sendDefaultPii: false,
  });
}
