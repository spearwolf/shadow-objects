import {describe, expect, it} from 'vitest';
import {onViewEvent} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

describe('TestEntity tree, token and events', () => {
  it('sendViewEvent reaches onViewEvent synchronously', () => {
    const t = createTestKernel();
    const seen: Array<[string, unknown]> = [];

    t.define('probe', function Probe({onViewEvent: onEvent}: ShadowObjectCreationAPI) {
      onEvent((type, data) => {
        seen.push([type, data]);
      });
    });

    const ent = t.createEntity('probe');
    ent.sendViewEvent('damage', {amount: 5});

    expect(seen).toEqual([['damage', {amount: 5}]]);

    t.dispose();
  });

  it('the [onViewEvent] hook of a class receives the same event', () => {
    const t = createTestKernel();
    const seen: Array<[string, unknown]> = [];

    t.define(
      'probe',
      class Probe {
        [onViewEvent](type: string, data: unknown) {
          seen.push([type, data]);
        }
      },
    );

    t.createEntity('probe').sendViewEvent('ping', 1);

    expect(seen).toEqual([['ping', 1]]);

    t.dispose();
  });

  it('emit carries an event from one Shadow Object to another on the same Entity', () => {
    const t = createTestKernel();
    const heard: number[] = [];

    t.define('sender', class Sender {});
    t.define(
      'receiver',
      class Receiver {
        playerDied(score: number) {
          heard.push(score);
        }
      },
    );
    t.route('player', ['sender', 'receiver']);

    const ent = t.createEntity('player');
    ent.emit('playerDied', 42);

    expect(heard).toEqual([42]);

    t.dispose();
  });

  it('setToken rebuilds the Shadow Objects of the Entity', () => {
    const t = createTestKernel();
    const log: string[] = [];

    t.define(
      'before',
      class Before {
        constructor() {
          log.push('before');
        }
      },
    );
    t.define(
      'after',
      class After {
        constructor() {
          log.push('after');
        }
      },
    );

    const ent = t.createEntity('before');
    expect(log).toEqual(['before']);

    ent.setToken('after');

    expect(log).toEqual(['before', 'after']);
    expect(ent.token).toBe('after');

    t.dispose();
  });

  it('setParent moves an Entity and setParent(undefined) makes it a root again', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const a = t.createEntity('probe');
    const b = t.createEntity('probe');
    const child = t.createEntity('probe');

    child.setParent(a);
    expect(child.entity.parentUuid).toBe(a.uuid);

    child.setParent(b, 2);
    expect(child.entity.parentUuid).toBe(b.uuid);
    expect(child.entity.order).toBe(2);

    child.setParent(undefined);
    expect(child.entity.hasParent).toBe(false);

    t.dispose();
  });

  it('a destroyed handle still answers with the token it held', () => {
    const t = createTestKernel();
    t.define('probe', class Probe {});

    const ent = t.createEntity('probe');
    ent.destroy();

    expect(t.kernel.hasEntity(ent.uuid)).toBe(false);
    expect(ent.token).toBe('probe');

    t.dispose();
  });
});
