import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, getEnvironmentName } from '@/lib/sentry-shared';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironmentName(),

    // 100% of errors in production. Sentry's free tier handles this fine
    // for a single-app setup; drop below 1.0 only if quota becomes tight.
    sampleRate: 1.0,

    // Performance & Session Replay sampled lower — they generate more
    // events than errors do and chew through quota faster.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      // Replay only when an error fires — gives you a video of the seconds
      // leading up to a bug without recording every session.
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event) {
      return shouldDropEvent(event) ? null : event;
    },

    // PII off by default — we don't want emails / names landing in Sentry
    // unless we explicitly attach them via setUser/setTag.
    sendDefaultPii: false,
  });
}
