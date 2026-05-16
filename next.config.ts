import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // In Next.js 15 the serverActions config moved under `experimental`.
    // 50mb covers the largest course-material uploads that go through
    // server actions (PDFs, video transcripts, bulk-import payloads).
    serverActions: {
      bodySizeLimit: '50mb',
    },
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

// Compose plugins: next-intl wraps the base config, Sentry wraps the result —
// but ONLY when SENTRY_DSN is present at build time.
//
// The Sentry webpack plugin transforms every chunk and generates source maps
// in memory, which pushed the Vercel default 8 GB build container into OOM
// (SIGKILL) when wired up unconditionally. Gating on SENTRY_DSN means: no
// DSN env var → no Sentry plugin in the build pipeline → exact pre-Sentry
// build cost. When you set SENTRY_DSN in Vercel (Production only), Sentry
// wraps the build; if memory becomes an issue then, enable Enhanced Builds
// or pass `widenClientFileUpload: false` here to narrow source-map scope.
const composed = withNextIntl(nextConfig);

const config = process.env.SENTRY_DSN
  ? withSentryConfig(composed, {
      // Used for source-map upload at build time. All three must be set
      // in the Vercel build env. If SENTRY_AUTH_TOKEN is missing, the
      // plugin still generates source maps but does not upload them —
      // stack traces in Sentry stay minified until the token is set.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Hide source-map upload logs unless the build is failing.
      silent: !process.env.CI,

      // Tunnel Sentry requests through /monitoring to bypass ad-blockers
      // that block requests to *.sentry.io. Stops you losing ~10% of
      // client errors on adblock users.
      tunnelRoute: '/monitoring',

      // Don't send Sentry's own initial telemetry pings during build.
      telemetry: false,

      // === Memory-budget knobs for the default 8 GB Vercel container ===
      // This app has 174 tables and 346+ routes; without these knobs the
      // Sentry webpack plugin OOMs the build container during chunk
      // transform + source-map generation.

      // Skip source-map generation entirely when no auth token is set.
      // Without an auth token we couldn't upload them anyway, so the
      // in-memory work was wasted. Once you add SENTRY_AUTH_TOKEN,
      // upload (and the memory cost) re-enables automatically.
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },

      // Don't widen the source-map upload glob beyond default chunks.
      // The default `true` includes vendor + framework chunks which
      // are large and rarely produce actionable stack traces.
      widenClientFileUpload: false,

      // Strip Sentry SDK features we're not using from the production
      // bundle. Each `excludeReplay*` shaves a few hundred KB off the
      // client bundle and proportionally less work for the build.
      bundleSizeOptimizations: {
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
        excludeReplayWorker: true,
        excludeDebugStatements: true,
      },
    })
  : composed;

// NOTE: a wizard re-run had added a second, unconditional withSentryConfig()
// wrap here with widenClientFileUpload: true. That stacked the Sentry
// webpack plugin into the build pipeline twice, undid the source-map
// scope narrowing on the inner wrap, and reintroduced the OOM that
// commit 2048495 fixed. The single conditional wrap above is sufficient —
// it already sets org/project/authToken/tunnelRoute/etc and conditionally
// disables source-map work to fit the 8 GB Vercel build container.
//
// If you want the wizard's automaticVercelMonitors instrumentation, add
// `automaticVercelMonitors: true` to the inner wrap options instead of
// stacking a second wrap.
export default config;
