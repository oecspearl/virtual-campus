import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Session Replay is intentionally NOT added here. It's the largest single
// Sentry bundle contributor (~100 KB minified) and a meaningful chunk of
// the build's memory cost. If a future debugging session genuinely needs
// the seconds-before-error video, re-enable it via Sentry.replayIntegration
// and add `excludeReplay*: false` in next.config.ts's bundleSizeOptimizations.

if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),

    // 100% of errors in production. Sentry's free tier handles this fine
    // for a single-app setup; drop below 1.0 only if quota becomes tight.
    sampleRate: 1.0,

    // 10% of transactions get full performance tracing.
    tracesSampleRate: 0.1,

    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },

    // PII off by default — we don't want emails / names landing in Sentry
    // unless we explicitly attach them via setUser/setTag.
    sendDefaultPii: false,
  });
}
