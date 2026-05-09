import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.{js,ts}'],
    setupFiles: ['../shadow-objects/vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: 'chromium'}],
    },
  },
});