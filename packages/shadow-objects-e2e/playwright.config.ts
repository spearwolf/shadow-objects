import {defineConfig, devices} from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
  retries: process.env['CI'] ? 2 : 0,
  // One worker on CI. Everywhere else the key stays out of the object: `workers` is declared
  // `number | string`, and its absence is what hands the count to Playwright's own default of
  // half the logical cores.
  // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
  ...(process.env['CI'] ? {workers: 1} : {}),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  // Only keep test artifacts for failures. Stale artifacts from a passing run
  // can confuse debugging — a failure context with a fresh timestamp looks current
  // even if it came from an older test execution.
  preserveOutput: 'failures-only',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4174',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },

    {
      name: 'firefox',
      use: {...devices['Desktop Firefox']},
    },

    {
      name: 'webkit',
      use: {...devices['Desktop Safari']},
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run preview', //  'pnpm run build:n:serve',
    url: 'http://localhost:4174',
    // biome-ignore lint/complexity/useLiteralKeys: process.env is typed via an index signature; noPropertyAccessFromIndexSignature (TS4111) requires the bracket form.
    reuseExistingServer: !process.env['CI'],
  },
});
