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

  it('a child reads a context its parent provides, one settle after the first read', async () => {
    const t = createTestKernel();
    const world = {gravity: -9.81};

    t.define('root', function Root({provideContext}: ShadowObjectCreationAPI) {
      provideContext('physicsWorld', world);
    });
    t.define('body', class Body {});

    const root = t.createEntity('root');
    const body = root.createChild('body');

    await t.settle();

    // Nothing on this Entity has touched the context yet, so this read is what creates the entry
    // and links it to the parent. The link feeds the inherited signal straight away, but the
    // effective value every reader sees runs through the Entity's microtask collector -- so a read
    // that creates the entry is always one settle too early, however long the parent has stood.
    expect(body.readContext('physicsWorld')).toBeUndefined();

    await t.settle();

    expect(body.readContext<typeof world>('physicsWorld')).toBe(world);

    t.dispose();
  });
});
