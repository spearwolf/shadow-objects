import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{spec,specs,test}.{js,ts}'],
    setupFiles: ['../shadow-objects/vitest.setup.ts'],
  },
});
