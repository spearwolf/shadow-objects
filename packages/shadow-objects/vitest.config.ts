import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.{js,ts}', 'src/**/*.test.{js,ts}'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // turbo's `test.outputs`, the CI artifact upload, `.gitignore` and
      // this path all name the same directory — change one, change all four.
      reportsDirectory: './coverage',
      // Without an include list only files that a test imported show up,
      // which hides every module that has no spec at all. Spec files, the
      // setup file and the config itself are excluded by vitest.
      include: ['src/**/*.{ts,js}'],
    },
  },
});