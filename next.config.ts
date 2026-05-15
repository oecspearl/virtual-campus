import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  serverActions: {
    bodySizeLimit: '50mb',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle CommonJS modules on server side
      config.externals = config.externals || [];
    }
    // Fix for CKEditor 5
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      // Static asset caching
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/site.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
  allowedDevOrigins: ['app-cosmic.com', '*.app-cosmic.com', 'vibecode.net', '*.vibecode.net'],
};

// Compose plugins: next-intl wraps the base config, Sentry wraps the result.
// withSentryConfig is a no-op at runtime when SENTRY_AUTH_TOKEN is unset;
// it just won't upload source maps in that case.
const composed = withNextIntl(nextConfig);

export default withSentryConfig(composed, {
  // Used for source-map upload at build time. Both must be set in the
  // Vercel build env (Production at minimum). If SENTRY_AUTH_TOKEN is
  // missing, withSentryConfig silently skips source-map upload and the
  // build still succeeds — stack traces will just be obfuscated in
  // Sentry until you add the token.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source-map upload logs unless the build is failing.
  silent: !process.env.CI,

  // Tunnel Sentry requests through /monitoring to bypass ad-blockers that
  // block requests to *.sentry.io. Adds one route but stops you losing
  // ~10% of client errors on adblock users.
  tunnelRoute: '/monitoring',

  // Don't send Sentry's own initial telemetry pings during build.
  telemetry: false,

  // Strip Sentry SDK debug logs from the production bundle.
  disableLogger: true,
});
