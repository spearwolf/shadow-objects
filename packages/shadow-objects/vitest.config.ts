import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.{js,ts}', 'src/**/*.test.{js,ts}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});