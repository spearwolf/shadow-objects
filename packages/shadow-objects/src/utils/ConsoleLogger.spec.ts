import {afterEach, describe, expect, it} from 'vitest';
import {ConsoleLogger} from './ConsoleLogger.js';

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
});