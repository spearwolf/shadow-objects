import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';
import type {TestEntity} from './types.js';

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

  // The registration order in `createTestKernel.createEntity()` is what this test pins, and the
  // guarantee is handle identity rather than delivery. Delivery is safe either way: the Kernel
  // hands every message to a microtask, so the recorder's lookup runs long after `createEntity()`
  // has returned and the handle is in the map whichever side of the Kernel call put it there.
  // What a late insert breaks is identity -- a constructor that asks for its own handle gets a
  // lazily built one, and the insert afterwards overwrites it. Two handles for one uuid, and the
  // messages land on the one the caller does not hold.
  it('hands a constructor the same handle createEntity() returns', async () => {
    const t = createTestKernel();
    let seenDuringConstruction: TestEntity | undefined;

    t.define('eager', function Eager({entity, dispatchMessageToView}: ShadowObjectCreationAPI) {
      seenDuringConstruction = t.entity(entity.uuid);
      dispatchMessageToView('constructed');
    });

    const ent = t.createEntity('eager');
    await t.settle();

    expect(seenDuringConstruction).toBe(ent);
    expect(ent.viewMessages).toEqual([{type: 'constructed', data: undefined, traverseChildren: false}]);

    t.dispose();
  });

  // The supported way to reach a farewell message. `dispose()` cannot deliver one: it unsubscribes
  // from the Kernel and releases the message log in the same synchronous call, while the message its
  // teardown dispatched is still sitting in a microtask. Destroying the Entity and settling has neither
  // problem, and it is what a test that cares about a farewell should do.
  it('records a farewell message dispatched from an [onDestroy] hook', async () => {
    const t = createTestKernel();

    t.define(
      'mortal',
      class Mortal {
        readonly #dispatch: ShadowObjectCreationAPI['dispatchMessageToView'];

        constructor({dispatchMessageToView}: ShadowObjectCreationAPI) {
          this.#dispatch = dispatchMessageToView;
        }

        [onDestroy]() {
          this.#dispatch('farewell');
        }
      },
    );

    const ent = t.createEntity('mortal');
    ent.destroy();
    await t.settle();

    expect(ent.viewMessages).toEqual([{type: 'farewell', data: undefined, traverseChildren: false}]);

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

  // Act, settle, then ask -- the order a test author writes by reflex, and the one the recording has
  // to survive. The log lives on the test kernel rather than on the handle, so a message dispatched
  // for a uuid no handle existed for is on the handle the first `entity()` call builds.
  it('records for a uuid whose handle is asked for only after the message was dispatched', async () => {
    const t = createTestKernel();

    t.define('probe', function Probe({dispatchMessageToView}: ShadowObjectCreationAPI) {
      dispatchMessageToView('hello', {from: 'a uuid the facade has no handle for'});
    });

    t.kernel.createEntity('late-uuid', 'probe');
    await t.settle();

    const late = t.entity('late-uuid');

    expect(late).toBeDefined();
    expect(late!.viewMessages).toEqual([
      {type: 'hello', data: {from: 'a uuid the facade has no handle for'}, traverseChildren: false},
    ]);

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
