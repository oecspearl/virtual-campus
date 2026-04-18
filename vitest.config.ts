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
      // Current baseline (April 2026): 18% lines, 18.5% statements, 15%
      // functions, 23% branches. Thresholds are set just below baseline as a
      // regression floor. Ratchet upward as new tests land — do NOT lower them.
      thresholds: {
        lines: 17,
        functions: 14,
        statements: 17,
        branches: 22,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
