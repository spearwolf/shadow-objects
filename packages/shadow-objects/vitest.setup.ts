import {afterAll, beforeAll} from 'vitest';

// Node 24+ ships an inert `localStorage`/`sessionStorage` on globalThis (without
// `--localstorage-file`). It shadows happy-dom's Storage in node-based test
// environments. Replace the descriptors so happy-dom's Storage is reachable
// from globalThis. In real-browser test environments the browser already
// provides a working Storage, so this fix is only applied under node.
if (typeof process !== 'undefined' && process.versions?.node && typeof localStorage?.getItem !== 'function') {
  const {Window} = await import('happy-dom');
  const win = new Window();
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, {
      value: win[key],
      configurable: true,
      writable: true,
    });
  }
}

// Mocha-style aliases for legacy specs migrated from @web/test-runner.
const g = globalThis as unknown as {after?: typeof afterAll; before?: typeof beforeAll};
if (typeof g.after !== 'function') g.after = afterAll;
if (typeof g.before !== 'function') g.before = beforeAll;
