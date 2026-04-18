import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Only count the modules we actually intend to cover for now —
      // the API routes and domain-specific integrations are excluded until
      // we have appropriate test helpers.
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/**/__tests__/**',
        'lib/**/*.d.ts',
        'lib/moodle/parser.ts',
        'lib/moodle/importer.ts',
        'lib/sonisweb/**',
        'lib/ai/**',
        'lib/analytics/**',
        'lib/crm/**',
        'lib/notifications/**',
        'lib/plagiarism/**',
        'lib/proctoring/**',
        'lib/reports/**',
        'lib/oauth/**',
        'lib/lti/**',
        'lib/admissions/**',
        'lib/certificates/**',
        'lib/firebase/**',
        'lib/i18n/**',
        'lib/oneroster/**',
        'lib/hooks/**',
        'lib/supabase-provider.tsx',
      ],
      // Current baseline (April 2026): 22% lines, 22.8% statements, 20%
      // functions, 26% branches. Thresholds are set just below baseline as a
      // regression floor. Ratchet upward as new tests land — do NOT lower them.
      thresholds: {
        lines: 21,
        functions: 19,
        statements: 22,
        branches: 25,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
