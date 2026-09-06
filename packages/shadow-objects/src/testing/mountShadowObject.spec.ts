import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
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
