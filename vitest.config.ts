import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment is node (fast, no DOM). Component tests opt into
    // jsdom by adding `// @vitest-environment jsdom` at the top of the file.
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./vitest-setup.ts'],
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
      // Current baseline (April 2026): 23.9% lines, 24.7% statements, 20.4%
      // functions, 27.4% branches. Thresholds are set just below baseline as a
      // regression floor. Ratchet upward as new tests land — do NOT lower them.
      thresholds: {
        lines: 23,
        functions: 20,
        statements: 24,
        branches: 27,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
