import {afterEach, describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {onCreate, onViewEvent} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

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

  describe('describeShadowObjects', () => {
    it('describes every shadow object of an entity with its tokens and hooks', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      @ShadowObject({registry, token: 'foo'})
      class Foo {
        constructor({useProperty, provideContext}: ShadowObjectCreationAPI) {
          useProperty('speed');
          provideContext('theme', 'dark');
        }
        [onCreate]() {}
        [onViewEvent]() {}
      }
      expect(Foo).toBeDefined();

      registry.appendRoute('node', ['foo']);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');

      expect(kernel.describeShadowObjects(uuid)).toEqual([
        {
          displayName: 'Foo',
          definedUnder: ['foo'],
          usesProperties: ['speed'],
          usesContexts: [],
          usesParentContexts: [],
          providesContexts: ['theme'],
          providesGlobalContexts: [],
          hooks: ['onCreate', 'onViewEvent'],
        },
      ]);
      expect(kernel.describeShadowObjects('nope')).toEqual([]);

      kernel.destroy();
    });
  });
});
