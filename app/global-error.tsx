'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Catches errors inside the root layout itself.
 *
 * `app/error.tsx` only catches errors thrown by pages and components
 * rendered inside the root layout. If the layout's own rendering
 * fails — usually a server-component crash, an i18n loader exploding,
 * or a provider throwing — Next falls back to this boundary instead.
 *
 * Must declare its own <html> + <body>: the root layout is what blew up,
 * so React can't reuse it.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              The application encountered an unexpected error. Please reload the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', marginBottom: '1rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#1e293b',
                color: 'white',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
