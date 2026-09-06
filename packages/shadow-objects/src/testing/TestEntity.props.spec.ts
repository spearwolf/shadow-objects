import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity properties and contexts', () => {
  it('setProps writes through the Kernel, so property routing is re-resolved', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define('base', class Base {});
    t.define(
      'boosted',
      class Boosted {
        constructor() {
          built.push('boosted');
        }
      },
    );
    t.route('base@turbo', ['boosted']);

    const ent = t.createEntity('base');
    expect(built).toEqual([]);

    ent.setProps({turbo: true});
    expect(built).toEqual(['boosted']);

    t.dispose();
  });

  it('readProp answers the current value without a signalize import', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {speed: 3});
    expect(ent.readProp<number>('speed')).toBe(3);

    ent.setProps({speed: 9});
    expect(ent.readProp<number>('speed')).toBe(9);

    expect(ent.readProp('never-set')).toBeUndefined();

    t.dispose();
  });

  it('removeProps sets the named properties back to undefined', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {a: 1, b: 2});
    ent.removeProps('a', 'b');

    expect(ent.readProp('a')).toBeUndefined();
    expect(ent.readProp('b')).toBeUndefined();

    t.dispose();
  });

  it('a property value arrives by identity -- nothing clones it', () => {
    const t = createTestKernel();
    const handle = {notCloneable: () => 42};
    let seen: unknown;

    t.define('probe', function Probe({useProperty, createEffect}: ShadowObjectCreationAPI) {
      const getHandle = useProperty('handle');
      createEffect(() => {
        seen = getHandle();
      });
    });

    t.createEntity('probe', {handle});

    expect(seen).toBe(handle);

    t.dispose();
  });

  it('readContext answers what a provider on the same Entity provided, one settle later', async () => {
    const t = createTestKernel();
    const scene = {name: 'the scene'};

    t.define('provider', function Provider({provideContext}: ShadowObjectCreationAPI) {
      provideContext('three-scene', scene);
    });

    const ent = t.createEntity('provider');

    expect(ent.readContext('three-scene')).toBeUndefined();

    await t.settle();

    expect(ent.readContext('three-scene')).toBe(scene);

    t.dispose();
  });

  it('a child reads a context its parent provides', async () => {
    const t = createTestKernel();
    const world = {gravity: -9.81};
    let bodyContextValue: unknown;

    t.define('root', function Root({provideContext}: ShadowObjectCreationAPI) {
      provideContext('physicsWorld', world);
    });
    t.define('body', function Body({useContext}: ShadowObjectCreationAPI) {
      // The child captures the context reader during construction, when the parent-child
      // link is being established. This differs from reading the context through the
      // TestEntity handle after construction, which accesses the context after deferrals
      // have been processed.
      bodyContextValue = useContext('physicsWorld');
    });

    const root = t.createEntity('root');
    root.createChild('body');

    await t.settle();

    // The child's shadow object captured the context reader during construction,
    // so it should have access to the parent's context value
    expect(bodyContextValue).toBeDefined();
    const reader = bodyContextValue as () => unknown;
    expect(reader()).toBe(world);

    t.dispose();
  });
});
