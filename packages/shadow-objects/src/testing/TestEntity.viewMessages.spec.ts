import {describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

// `traverseChildren: false` stands in every expectation below on purpose. Both layers of the
// dispatch -- `ShadowObjectCreationScope.dispatchMessageToView()` and
// `Entity.dispatchMessageToView()` -- declare the parameter as `traverseChildren = false`, so a
// message that came through the creation API always carries the field, never omits it. The
// recorder's conditional spread is for the other entrance: `Kernel.dispatchMessageToView()` takes a
// `MessageToViewEvent` whose `traverseChildren` is optional, and a caller assembling one by hand
// may leave it out.
describe('TestEntity view messages', () => {
  it('records what a Shadow Object dispatched, after one settle', async () => {
    const t = createTestKernel();

    t.define('player', function PlayerLogic({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
      const getScore = useProperty<number>('score');
      createEffect(() => {
        dispatchMessageToView('score-updated', {value: getScore()});
      });
    });

    const ent = t.createEntity('player', {score: 0});

    expect(ent.viewMessages).toEqual([]);

    await t.settle();

    expect(ent.viewMessages).toEqual([{type: 'score-updated', data: {value: 0}, traverseChildren: false}]);

    ent.setProps({score: 10});
    await t.settle();

    expect(ent.viewMessages).toEqual([
      {type: 'score-updated', data: {value: 0}, traverseChildren: false},
      {type: 'score-updated', data: {value: 10}, traverseChildren: false},
    ]);

    t.dispose();
  });

  it('carries traverseChildren and hands the payload over by identity', async () => {
    const t = createTestKernel();
    const payload = {node: {tag: 'not cloneable in a worker'}};

    t.define('probe', function Probe({dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('hello', payload, undefined, true);
    });

    const ent = t.createEntity('probe');
    await t.settle();

    expect(ent.viewMessages).toHaveLength(1);
    expect(ent.viewMessages[0]!.traverseChildren).toBe(true);
    expect(ent.viewMessages[0]!.data).toBe(payload);

    t.dispose();
  });

  // The registration order in `createTestKernel.createEntity()` is what this test pins: the handle
  // goes into the map before the Kernel call, so a Shadow Object that dispatches from its own
  // constructor has somewhere for its message to land. Without the early insert the message is
  // dropped in silence, and nothing else in the suite would notice.
  it('records a message a Shadow Object dispatched from its own constructor', async () => {
    const t = createTestKernel();

    t.define('eager', function Eager({dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('constructed');
    });

    const ent = t.createEntity('eager');
    await t.settle();

    expect(ent.viewMessages).toEqual([{type: 'constructed', data: undefined, traverseChildren: false}]);

    t.dispose();
  });

  // The other half of that order: a constructor that throws must leave no handle behind.
  it('leaves no handle behind when a constructor throws', () => {
    const t = createTestKernel();

    t.define('doomed', function Doomed() {
      throw new RangeError('constructor gave up');
    });

    expect(() => t.createEntity('doomed', undefined, {uuid: 'doomed-uuid'})).toThrow(/constructor gave up/);
    expect(t.entity('doomed-uuid')).toBeUndefined();

    t.clearErrors();
    t.dispose();
  });

  it('records on the Entity that sent it, and clearViewMessages empties one list', async () => {
    const t = createTestKernel();

    t.define('probe', function Probe({entity, dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('from', entity.uuid);
    });

    const a = t.createEntity('probe');
    const b = t.createEntity('probe');
    await t.settle();

    expect(a.viewMessages).toEqual([{type: 'from', data: a.uuid, traverseChildren: false}]);
    expect(b.viewMessages).toEqual([{type: 'from', data: b.uuid, traverseChildren: false}]);

    a.clearViewMessages();

    expect(a.viewMessages).toEqual([]);
    expect(b.viewMessages).toHaveLength(1);

    t.dispose();
  });
});
