import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity shadow object access', () => {
  it('instanceOf finds a class instance and types it', () => {
    const t = createTestKernel();

    class PlayerLogic {
      score = 7;
    }
    t.define('player', PlayerLogic);

    const ent = t.createEntity('player');
    const instance = ent.instanceOf(PlayerLogic);

    expect(instance.score).toBe(7);
    expect(ent.shadowObjects()).toHaveLength(1);

    t.dispose();
  });

  it('instanceOf finds an object a function constructor returned', () => {
    const t = createTestKernel();

    function HealthLogic(_api: ShadowObjectCreationAPI) {
      return {health: 100};
    }
    t.define('health', HealthLogic);

    const ent = t.createEntity('health');

    expect(ent.instanceOf(HealthLogic).health).toBe(100);

    t.dispose();
  });

  it('instanceOf picks the right one out of three on a composite token', () => {
    const t = createTestKernel();

    class Physics {}
    class Health {
      hp = 50;
    }
    class Render {}

    t.define('physics', Physics);
    t.define('health', Health);
    t.define('render', Render);
    t.route('player', ['physics', 'health', 'render']);

    const ent = t.createEntity('player');

    expect(ent.shadowObjects()).toHaveLength(3);
    expect(ent.instanceOf(Health).hp).toBe(50);

    t.dispose();
  });

  it('instanceOf throws with the display name when nothing matches', () => {
    const t = createTestKernel();

    class Present {}
    class Absent {}
    t.define('probe', Present);

    const ent = t.createEntity('probe');

    expect(() => ent.instanceOf(Absent)).toThrow(/Absent/);

    t.dispose();
  });

  it('prefers identity over the display name when another constructor shares the name', () => {
    const t = createTestKernel();

    class Collide {
      readonly from = 'class';
    }

    const twin = function Other(_api: ShadowObjectCreationAPI) {
      return {from: 'function'};
    };
    twin.displayName = 'Collide';

    t.define('a', Collide);
    t.define('b', twin);
    t.route('both', ['a', 'b']);

    const ent = t.createEntity('both');

    expect(ent.shadowObjects()).toHaveLength(2);
    expect(ent.instanceOf(Collide).from).toBe('class');

    t.dispose();
  });

  it('throws when two function constructors share a display name, because nothing separates them', () => {
    const t = createTestKernel();

    const first = function First(_api: ShadowObjectCreationAPI) {
      return {which: 1};
    };
    const second = function Second(_api: ShadowObjectCreationAPI) {
      return {which: 2};
    };
    first.displayName = 'Twin';
    second.displayName = 'Twin';

    t.define('a', first);
    t.define('b', second);
    t.route('both', ['a', 'b']);

    const ent = t.createEntity('both');

    expect(() => ent.instanceOf(first)).toThrow(/2 shadow objects built from "Twin"/);

    t.dispose();
  });

  it('describe names the properties, contexts and hooks a Shadow Object uses', () => {
    const t = createTestKernel();

    t.define('player', function PlayerLogic({useProperty, useContext, onDestroy}: ShadowObjectCreationAPI) {
      useProperty('score');
      useContext('three-scene');
      onDestroy(() => {});
    });

    const ent = t.createEntity('player');
    const [description] = ent.describe();

    expect(description!.displayName).toBe('PlayerLogic');
    expect(description!.usesProperties).toEqual(['score']);
    expect(description!.usesContexts).toEqual(['three-scene']);
    expect(description!.definedUnder).toEqual(['player']);

    t.dispose();
  });

  it('answers empty for an Entity that is gone', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe');
    ent.destroy();

    expect(ent.shadowObjects()).toEqual([]);
    expect(ent.describe()).toEqual([]);

    t.dispose();
  });
});
