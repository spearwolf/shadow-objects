import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  optimizeDeps: {
    // The library has to reach the browser as individual modules, not as a
    // pre-bundled dependency chunk: coverage is attributed per module, and a
    // chunk has no module to attribute it to. Excluding it hands its own
    // dependencies to vite as newly discovered ones mid-run, which reloads the
    // page and drops the specs that were importing at that moment — so they are
    // named up front. The `a > b` form is what reaches a dependency of a
    // dependency; a bare name does not resolve from this package.
    exclude: ['@spearwolf/shadow-objects'],
    include: [
      '@spearwolf/shadow-objects > @spearwolf/signalize',
      '@spearwolf/shadow-objects > @spearwolf/signalize/decorators',
      '@spearwolf/shadow-objects > @spearwolf/eventize',
    ],
  },
  test: {
    globals: true,
    include: ['test/**/*.test.{js,ts}'],
    globalSetup: ['./vitest.globalSetup.ts'],
    setupFiles: ['../shadow-objects/vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: 'chromium'}],
    },
    coverage: {
      provider: 'v8',
      // Only the raw report: the merged one under `coverage/` in the repository
      // root is what this suite's numbers are for, and it is written by
      // `scripts/mergeCoverage.mjs`.
      reporter: ['json'],
      // turbo's `test.outputs`, the CI artifact upload, `.gitignore` and this path
      // all name the same directory — change one, change all four.
      reportsDirectory: './coverage',
      // The files under test live in the neighbouring package, and everything
      // outside this package's root is dropped without this.
      allowExternal: true,
      // The suite imports the built package, so the pattern names the build
      // output. What lands in the report are the `src/**/*.ts` the build was made
      // from — the v8 provider follows the source maps back. The four helpers
      // under this package's own `src/` are test scaffolding and stay out.
      include: ['packages/shadow-objects/dist/src/**/*.js'],
    },
  },
});
