import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.{js,ts}', 'src/**/*.test.{js,ts}'],
    setupFiles: ['./vitest.setup.ts'],
    // `--expose-gc` is what puts `globalThis.gc` into the test process, and the reachability
    // spec needs it to force a collection instead of hoping for one. `execArgv` reaches a
    // spawned node process, which is what the `forks` pool gives each test file — so the pool
    // is named here rather than left to the default: a future change of that default would
    // otherwise take the flag away without a word.
    pool: 'forks',
    execArgv: ['--expose-gc'],
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
