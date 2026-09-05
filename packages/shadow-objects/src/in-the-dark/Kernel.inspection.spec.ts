import {afterEach, describe, expect, it} from 'vitest';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';

describe('Kernel inspection accessors', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('tokenOf', () => {
    it('answers the token of an entity the kernel holds, and undefined otherwise', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');

      expect(kernel.tokenOf(uuid)).toBe('node');
      expect(kernel.tokenOf('nope')).toBeUndefined();

      kernel.changeToken(uuid, 'other');
      expect(kernel.tokenOf(uuid)).toBe('other');

      kernel.destroy();
    });
  });

  describe('root contexts', () => {
    it('names the global chains it holds and describes one by value and members', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const e = kernel.getEntity(uuid);

      expect(kernel.rootContextNames()).toEqual([]);
      expect(kernel.describeRootContext('g')).toBeUndefined();

      const sig = e.provideGlobalContext('g');
      sig.set('v');

      expect(kernel.rootContextNames()).toEqual(['g']);
      expect(kernel.describeRootContext('g')).toEqual({value: 'v', signals: [sig]});

      kernel.destroy();
      expect(kernel.rootContextNames()).toEqual([]);
    });
  });
});
