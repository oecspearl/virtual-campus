import * as Sentry from '@sentry/nextjs';

/**
 * Next.js calls this once at server startup for each runtime.
 * The conditional require avoids loading the Node SDK in the edge bundle
 * and vice versa — they have different module systems and APIs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/** Called for every unhandled request error in server components / route handlers. */
export const onRequestError = Sentry.captureRequestError;
