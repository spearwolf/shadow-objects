import {afterAll, beforeAll} from 'vitest';

// Node 24+ ships an inert `localStorage`/`sessionStorage` on globalThis (without
// `--localstorage-file`). It shadows happy-dom's Storage in node-based test
// environments. Replace the descriptors so happy-dom's Storage is reachable
// from globalThis. In real-browser test environments the browser already
// provides a working Storage, so this fix is only applied under node.
//
// Node exposes its stand-in as an accessor (a getter) on globalThis; reading
// through it — e.g. `localStorage?.getItem` — triggers Node's own
// `--localstorage-file` warning once per test process (the `forks` pool gives
// every spec file its own). happy-dom or a real browser installs Storage as a
// plain data property instead, so the descriptor shape tells the two apart
// without ever invoking the getter.
//
// This file is `setupFiles` for three vitest configs: packages/shadow-objects
// (happy-dom), packages/shadow-objects-testing (browser mode) and
// packages/shae-offscreen-canvas (happy-dom). The replacement is a global patch on
// an object the library under test reads itself: utils/ConsoleLogger.ts looks for a
// usable Storage once, in a module-level IIFE, and keeps the result in a module
// constant. Whether it sees the replacement depends on this file running before
// that module's first import — which is what `setupFiles` guarantees.
//
// `isNode && storageIsAccessor` is where a Node upgrade lands. If Node ever ships
// its `localStorage` as a data property instead of a getter, `storageIsAccessor`
// turns false, the replacement is skipped without a word, and every spec that
// needs a working `localStorage` fails at once. What to do then depends on what
// Node put there: a usable `Storage` needs no replacement and this block can go;
// a still-inert one in a different shape needs a condition that checks usability
// instead of the descriptor's shape.
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
const storageIsAccessor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.get != null;

if (isNode && storageIsAccessor) {
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
