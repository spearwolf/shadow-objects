import {describe, expect, it} from 'vitest';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('createTestKernel', () => {
  it('builds on a Registry of its own, leaving the default Registry untouched', () => {
    const t = createTestKernel();

    t.define('isolated-token', class Isolated {});

    expect(t.registry).not.toBe(Registry.get());
    expect(t.registry.hasToken('isolated-token')).toBe(true);
    expect(Registry.get().hasToken('isolated-token')).toBe(false);

    t.dispose();
  });

  it('two test kernels do not see each other definitions', () => {
    const a = createTestKernel();
    const b = createTestKernel();

    a.define('only-in-a', class OnlyInA {});

    expect(b.registry.hasToken('only-in-a')).toBe(false);

    a.dispose();
    b.dispose();
  });

  it('creates an entity with object-shaped properties and hands back a stable handle', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe', {score: 7, name: 'Ragnar'});

    expect(ent.uuid).toMatch(/^[0-9a-f]{8}-/);
    expect(ent.token).toBe('probe');
    expect(t.kernel.hasEntity(ent.uuid)).toBe(true);
    expect(ent.entity.getProperty('score')).toBe(7);
    expect(ent.entity.getProperty('name')).toBe('Ragnar');
    expect(t.entity(ent.uuid)).toBe(ent);

    t.dispose();
  });

  it('honours an explicit uuid, an order and a parent', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const parent = t.createEntity('probe', undefined, {uuid: 'parent-uuid'});
    const child = t.createEntity('probe', undefined, {uuid: 'child-uuid', order: 5, parent});

    expect(child.entity.parentUuid).toBe('parent-uuid');
    expect(child.entity.order).toBe(5);

    t.dispose();
  });

  it('hands out a handle for an Entity a Shadow Object created on its own', () => {
    const t = createTestKernel();

    t.define('probe', class Probe {});
    t.define('spawner', function Spawner({entity}: ShadowObjectCreationAPI) {
      entity.kernel.createEntity('spawned-uuid', 'probe', entity.uuid);
    });

    t.createEntity('spawner');

    const spawned = t.entity('spawned-uuid');
    expect(spawned).toBeDefined();
    expect(spawned!.uuid).toBe('spawned-uuid');
    expect(spawned!.token).toBe('probe');
    expect(t.entity('spawned-uuid')).toBe(spawned);
    expect(t.entity('never-existed')).toBeUndefined();

    t.dispose();
  });

  it('resolves a composite token through a route', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define(
      'physics',
      class Physics {
        constructor() {
          built.push('physics');
        }
      },
    );
    t.define(
      'health',
      class Health {
        constructor() {
          built.push('health');
        }
      },
    );
    t.route('player', ['physics', 'health']);

    t.createEntity('player');

    // Set-wise: the Registry promises which constructors a route resolves to, not the order it
    // hands them over in. Asserting the order here would test an implementation detail.
    expect(built).toHaveLength(2);
    expect(built).toContain('physics');
    expect(built).toContain('health');

    t.dispose();
  });

  it('imports a shadow objects module into its own Registry', async () => {
    const t = createTestKernel();
    const built: string[] = [];

    await t.importModule({
      define: {
        'from-module': class FromModule {
          constructor() {
            built.push('from-module');
          }
        },
      },
    });

    t.createEntity('from-module');

    expect(built).toEqual(['from-module']);
    expect(Registry.get().hasToken('from-module')).toBe(false);

    t.dispose();
  });

  it('dispose() destroys the Kernel and empties the Registry it created', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});
    const ent = t.createEntity('probe');

    t.dispose();

    expect(t.kernel.hasEntity(ent.uuid)).toBe(false);
    expect(t.kernel.debugEntityCounts.entities).toBe(0);
    expect(t.registry.hasToken('probe')).toBe(false);
  });

  it('leaves a Registry it was handed alone', () => {
    const registry = new Registry();
    registry.define('borrowed', class Borrowed {});

    const t = createTestKernel({registry});
    t.dispose();

    expect(registry.hasToken('borrowed')).toBe(true);
  });

  it('dispose() is idempotent', () => {
    const t = createTestKernel();
    t.dispose();
    expect(() => t.dispose()).not.toThrow();
  });
});
