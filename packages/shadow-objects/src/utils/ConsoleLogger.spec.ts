import {afterEach, describe, expect, it} from 'vitest';
import {ConsoleLogger, type ConsoleLoggerControl} from './ConsoleLogger.js';

// The handle is reached through this module-local cast rather than `globalThis.ConsoleLogger`
// directly: the type is not ambient (see the comment on `gGlobalSlots` in ConsoleLogger.ts),
// so a spec asking for it needs the same kind of view the module itself uses.
const consoleLoggerHandle = () => (globalThis as typeof globalThis & {ConsoleLogger: ConsoleLoggerControl}).ConsoleLogger;

describe('ConsoleLogger', () => {
  afterEach(() => {
    localStorage.removeItem('ConsoleLogger.styles.debug');
  });

  it('reads a style from storage as-is', () => {
    const before = ConsoleLogger.sharedStyles.debug;
    localStorage.setItem('ConsoleLogger.styles.debug', 'color: hotpink');
    try {
      ConsoleLogger.loadConfig();
      expect(ConsoleLogger.sharedStyles.debug).toBe('color: hotpink');
    } finally {
      ConsoleLogger.sharedStyles.debug = before;
    }
  });

  describe('the constructor and the storage of the host', () => {
    it('creates no key when a logger is built', () => {
      const keysBefore = new Set<string | null>();
      for (let i = 0; i < localStorage.length; i++) {
        keysBefore.add(localStorage.key(i));
      }

      try {
        new ConsoleLogger('quiet-namespace');

        const keysAfter = new Set<string | null>();
        for (let i = 0; i < localStorage.length; i++) {
          keysAfter.add(localStorage.key(i));
        }

        expect(keysAfter).toEqual(keysBefore);
        expect(localStorage.getItem('ConsoleLogger.quiet-namespace.enable')).toBeNull();
      } finally {
        localStorage.removeItem('ConsoleLogger.quiet-namespace.enable');
      }
    });

    it('reads a per-namespace enable flag that is already there', () => {
      localStorage.setItem('ConsoleLogger.muted-namespace.enable', 'false');
      try {
        const logger = new ConsoleLogger('muted-namespace');
        expect(logger.enable).toBe(false);
        expect(logger.isEnabled).toBe(false);
      } finally {
        localStorage.removeItem('ConsoleLogger.muted-namespace.enable');
      }
    });

    it('writes through the globalThis handle', () => {
      new ConsoleLogger('handle-namespace');

      const before = consoleLoggerHandle().debug;
      try {
        consoleLoggerHandle().debug = true;
        expect(localStorage.getItem('ConsoleLogger.debug')).toBe('true');
        expect(ConsoleLogger.sharedConfig.debug).toBe(true);
      } finally {
        consoleLoggerHandle().debug = before;
        localStorage.removeItem('ConsoleLogger.debug');
      }
    });
  });
});