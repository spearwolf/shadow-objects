import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {mountShadowObject} from './mountShadowObject.js';

describe('mountShadowObject', () => {
  it('mounts one object with properties and records what it sent to the View', async () => {
    class PlayerLogic {
      constructor({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
        const getScore = useProperty<number>('score');
        createEffect(() => {
          dispatchMessageToView('score-updated', {value: getScore()});
        });
      }
    }

    const so = await mountShadowObject(PlayerLogic, {props: {score: 0}});

    expect(so.instance).toBeInstanceOf(PlayerLogic);
    expect(so.viewMessages).toEqual([{type: 'score-updated', data: {value: 0}, traverseChildren: false}]);

    so.setProps({score: 10});
    await so.settle();

    expect(so.viewMessages).toEqual([
      {type: 'score-updated', data: {value: 0}, traverseChildren: false},
      {type: 'score-updated', data: {value: 10}, traverseChildren: false},
    ]);

    so.dispose();
  });

  it('every context has reached every reader by the time the mount resolves', async () => {
    const scene = {name: 'the scene'};
    const seen: unknown[] = [];

    function SceneConsumer({useContext, createEffect}: ShadowObjectCreationAPI) {
      const getScene = useContext('three-scene');
      createEffect(() => {
        seen.push(getScene());
      });
      return {read: () => getScene()};
    }

    const so = await mountShadowObject(SceneConsumer, {contexts: {'three-scene': scene}});

    expect(so.readContext('three-scene')).toBe(scene);
    expect(seen.at(-1)).toBe(scene);
    expect(so.instance.read()).toBe(scene);

    so.dispose();
  });

  it('takes a symbol-keyed context', async () => {
    const key = Symbol('physics-world');
    const world = {gravity: -9.81};

    // The reader is taken during construction, the way a Shadow Object is written. A `useContext()`
    // left inside the returned closure would make `so.readContext(key)` the first touch of that
    // context, and a first touch is what creates the entry -- so it would read `undefined` and need
    // one more settle, which is a property of the Entity and has nothing to do with symbols.
    function Body({useContext}: ShadowObjectCreationAPI) {
      const getWorld = useContext(key);
      return {read: () => getWorld()};
    }

    const so = await mountShadowObject(Body, {contexts: {[key]: world}});

    expect(so.readContext(key)).toBe(world);
    expect(so.instance.read()).toBe(world);

    so.dispose();
  });

  it('the synthetic parent has settled before the object under test is built', async () => {
    const world = {gravity: -9.81};
    let seenInConstructor: unknown;

    function Body({useParentContext}: ShadowObjectCreationAPI) {
      // `useParentContext()` reads the inherited signal, which the link to the parent writes without
      // going through the Entity's microtask collector -- so it answers inside the constructor body.
      // It answers with the *value* only because the mount settled after creating the parent: the
      // parent's own context signal was already filled when the link was made. This test is what
      // makes the first of the mount's two settles load-bearing.
      seenInConstructor = useParentContext('physicsWorld')();
    }

    const so = await mountShadowObject(Body, {contexts: {physicsWorld: world}});

    expect(seenInConstructor).toBe(world);

    so.dispose();
  });

  it('delivers a View event and exposes the test kernel underneath', async () => {
    const seen: Array<[string, unknown]> = [];

    function Damageable({onViewEvent}: ShadowObjectCreationAPI) {
      onViewEvent((type, data) => {
        seen.push([type, data]);
      });
    }

    const so = await mountShadowObject(Damageable);

    so.sendViewEvent('damage', {amount: 5});

    expect(seen).toEqual([['damage', {amount: 5}]]);
    expect(so.testKernel.kernel.hasEntity(so.uuid)).toBe(true);

    so.dispose();
  });

  it('registers under the token it was given, and under a generated one otherwise', async () => {
    class Named {}

    const explicit = await mountShadowObject(Named, {token: 'my-token'});
    expect(explicit.token).toBe('my-token');
    explicit.dispose();

    const generated = await mountShadowObject(Named);
    expect(generated.token).not.toBe('my-token');
    expect(generated.describe()[0]!.definedUnder).toEqual([generated.token]);
    generated.dispose();
  });

  // `MountedShadowObject` hand-writes one forwarder per `TestEntity` member. `Omit<TestEntity, …>`
  // makes the compiler check that none is missing; nothing but this test checks that each one calls
  // the member it is named after. Several plausible swaps typecheck clean -- `readProp` forwarding
  // to `readContext`, the `token` getter answering with `uuid`, `clearViewMessages` calling
  // `destroy` -- so every member is driven once here and compared against the Entity underneath.
  it('every delegated member reaches the member of the Entity it is named after', async () => {
    const viewEvents: Array<[string, unknown]> = [];
    const busEvents: number[] = [];
    const world = {name: 'the world'};

    class Probe {
      constructor({useProperty, useContext, onViewEvent, dispatchMessageToView}: ShadowObjectCreationAPI) {
        useProperty('score');
        useContext('world');
        onViewEvent((type, data) => {
          viewEvents.push([type, data]);
        });
        dispatchMessageToView('mounted');
      }

      ping(score: number) {
        busEvents.push(score);
      }
    }

    const so = await mountShadowObject(Probe, {props: {score: 1}, contexts: {world}, token: 'probe-token'});
    const ent = so.testKernel.entity(so.uuid)!;
    const parentUuid = ent.entity.parentUuid!;

    // The four getters.
    expect(so.uuid).toBe(ent.uuid);
    expect(so.token).toBe(ent.token);
    expect(so.token).toBe('probe-token');
    expect(so.entity).toBe(ent.entity);
    expect(so.viewMessages).toEqual(ent.viewMessages);
    expect(so.viewMessages).toEqual([{type: 'mounted', data: undefined, traverseChildren: false}]);

    // The two readers, which are the pair most easily crossed.
    expect(so.readProp('score')).toBe(1);
    expect(so.readProp('score')).toBe(ent.readProp('score'));
    expect(so.readContext('world')).toBe(world);
    expect(so.readContext('world')).toBe(ent.readContext('world'));

    // The two writers, read back through the Entity.
    so.setProps({score: 42});
    expect(ent.readProp('score')).toBe(42);
    so.removeProps('score');
    expect(ent.readProp('score')).toBeUndefined();

    // The two event directions.
    so.sendViewEvent('damage', {amount: 5});
    expect(viewEvents).toEqual([['damage', {amount: 5}]]);
    so.emit('ping', 7);
    expect(busEvents).toEqual([7]);

    // The three inspection members.
    expect(so.shadowObjects()).toEqual(ent.shadowObjects());
    expect(so.shadowObjects()).toContain(so.instance);
    expect(so.shadowObjectOf(Probe)).toBe(ent.shadowObjectOf(Probe));
    expect(so.describe()).toEqual(ent.describe());
    expect(so.describe()[0]!.displayName).toBe('Probe');

    // The two movers. `setParent(undefined)` makes the Entity a root; handing the synthetic parent
    // back in restores it, with an order the Entity reports.
    so.setParent(undefined);
    expect(ent.entity.parentUuid).toBeUndefined();
    so.setParent(so.testKernel.entity(parentUuid), 3);
    expect(ent.entity.parentUuid).toBe(parentUuid);
    expect(ent.entity.order).toBe(3);

    so.testKernel.define('other-token', Probe);
    so.setToken('other-token');
    expect(ent.token).toBe('other-token');

    // Last, because it empties what the assertions above read -- and because a `clearViewMessages`
    // that called `destroy` would pass every one of them.
    so.clearViewMessages();
    expect(so.viewMessages).toEqual([]);
    expect(ent.viewMessages).toEqual([]);
    expect(so.testKernel.kernel.hasEntity(so.uuid)).toBe(true);

    so.dispose();
  });

  it('a constructor that throws reaches the caller, and the test kernel goes down with it', async () => {
    let kernel: Kernel | undefined;

    class Doomed {
      constructor({entity}: ShadowObjectCreationAPI) {
        kernel = entity.kernel;
        throw new RangeError('constructor gave up');
      }
    }

    // `contexts` buys a synthetic parent Entity, and that Entity outlives the failed creation of the
    // object under test -- only a teardown takes it down. So the Kernel's entity count is what says
    // whether the mount disposed the test kernel it can no longer hand anyone.
    const failure = await mountShadowObject(Doomed, {contexts: {world: {}}}).catch((error: unknown) => error);

    // The original error, not the one `dispose()` raises over the Kernel report this failure made.
    expect(failure).toBeInstanceOf(RangeError);
    expect((failure as Error).message).toMatch(/constructor gave up/);

    expect(kernel).toBeDefined();
    expect(kernel!.debugEntityCounts.entities).toBe(0);
  });

  it('dispose() carries the failing-error default of the test kernel', async () => {
    class BrokenTeardown {
      [onDestroy]() {
        throw new RangeError('teardown went wrong');
      }
    }

    const so = await mountShadowObject(BrokenTeardown);

    expect(() => so.dispose()).toThrow(/teardown went wrong/);
  });
});
