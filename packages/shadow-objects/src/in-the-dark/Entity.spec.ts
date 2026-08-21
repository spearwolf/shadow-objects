import {on} from '@spearwolf/eventize';
import {createEffect, createSignal, value} from '@spearwolf/signalize';
import {describe, expect, it} from 'vitest';
import {generateUUID} from '../utils/generateUUID.js';
import {onDestroy, onParentChanged} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';

// Context values are written by a collector that flushes in a microtask, so a reader
// only sees them after the queue has been drained.
const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

// Every case gets its own registry: `new Kernel()` without an argument falls back to the
// module-wide default registry, which would carry state from one case into the next.
const makeKernel = () => new Kernel(new Registry());

describe('Entity', () => {
  describe('Entity Context along the entity tree', () => {
    it('binds a context the child already holds to the parent it is attached to', async () => {
      const kernel = makeKernel();
      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child');

      const parent = kernel.getEntity(parentUuid);
      const child = kernel.getEntity(childUuid);

      parent.provideContext('ctx').set('from-parent');

      // the consumer exists before the attachment, so it starts out bound to the root context
      const consumer = child.useContext('ctx');

      child.parent = parent;

      await nextMicrotask();

      expect(value(consumer), 'the child reads the value its new parent provides').toBe('from-parent');

      kernel.destroy();
    });

    // Regression guard: the binding must not depend on where the child lands among the siblings.
    // With a sibling present the child is not the head of the list, which is the other shape the
    // insertion can produce.
    it('binds a context the child already holds to the parent when a sibling is there already', async () => {
      const kernel = makeKernel();
      const [parentUuid, siblingUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(siblingUuid, 'sibling', parentUuid);
      kernel.createEntity(childUuid, 'child');

      const parent = kernel.getEntity(parentUuid);
      const child = kernel.getEntity(childUuid);

      parent.provideContext('ctx').set('from-parent');

      const consumer = child.useContext('ctx');

      child.parent = parent;

      await nextMicrotask();

      expect(value(consumer), 'a sibling that is there already changes nothing about the binding').toBe('from-parent');

      kernel.destroy();
    });

    it('keeps a context bound to the root while the entity has no parent', async () => {
      const kernel = makeKernel();
      const [providerUuid, consumerUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(providerUuid, 'provider');
      kernel.createEntity(consumerUuid, 'consumer');

      kernel.getEntity(providerUuid).provideGlobalContext('ctx').set('from-root');

      const consumer = kernel.getEntity(consumerUuid).useContext('ctx');

      await nextMicrotask();

      expect(value(consumer)).toBe('from-root');

      kernel.destroy();
    });

    it('re-binds a context to the root when the entity loses its parent', async () => {
      const kernel = makeKernel();
      const [providerUuid, parentUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(providerUuid, 'provider');
      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);

      kernel.getEntity(providerUuid).provideGlobalContext('ctx').set('from-root');
      kernel.getEntity(parentUuid).provideContext('ctx').set('from-parent');

      const consumer = kernel.getEntity(childUuid).useContext('ctx');

      await nextMicrotask();

      expect(value(consumer), 'the parent shadows the root while the child hangs below it').toBe('from-parent');

      // no second argument: the child is detached and falls back to the root context
      kernel.setParent(childUuid);

      await nextMicrotask();

      expect(value(consumer), 'a detached entity reads the root context again').toBe('from-root');

      kernel.destroy();
    });

    it('re-binds a context to the root when the entity is detached through the entity API', async () => {
      const kernel = makeKernel();
      const [providerUuid, parentUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(providerUuid, 'provider');
      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);

      kernel.getEntity(providerUuid).provideGlobalContext('ctx').set('from-root');
      kernel.getEntity(parentUuid).provideContext('ctx').set('from-parent');

      const child = kernel.getEntity(childUuid);
      const consumer = child.useContext('ctx');

      await nextMicrotask();

      expect(value(consumer)).toBe('from-parent');

      // the entity API detaches without the kernel in between, so nothing re-binds afterwards
      child.parent = undefined;

      await nextMicrotask();

      expect(value(consumer), 'a detached entity reads the root context again').toBe('from-root');

      kernel.destroy();
    });

    it('re-binds a context to the root when the parent is destroyed and the child is promoted', async () => {
      const kernel = makeKernel();
      const [providerUuid, parentUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(providerUuid, 'provider');
      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);

      const rootValue = kernel.getEntity(providerUuid).provideGlobalContext('ctx');
      rootValue.set('from-root');
      kernel.getEntity(parentUuid).provideContext('ctx').set('from-parent');

      const consumer = kernel.getEntity(childUuid).useContext('ctx');

      await nextMicrotask();

      expect(value(consumer)).toBe('from-parent');

      // a child without the auto-destruction flag is promoted to root instead of being taken down with its parent
      kernel.destroyEntity(parentUuid);

      await nextMicrotask();

      expect(value(consumer), 'the promoted child reads the root context').toBe('from-root');

      // and it keeps following it: a binding that was merely cut would freeze on the value above
      rootValue.set('root-again');

      await nextMicrotask();

      expect(value(consumer), 'the promoted child follows the root context').toBe('root-again');

      kernel.destroy();
    });

    // Collects every value `useParentContext()` lets through while an entity moves from one parent
    // to another. That reader hands out `inherited` itself, without the microtask collector that
    // smooths `useContext()`, so each write on the way is a value a shadow object gets to see.
    const collectInheritedWhileMoving = async (move: (kernel: Kernel, childUuid: string, parentBUuid: string) => void) => {
      const kernel = makeKernel();
      const [rootUuid, parentAUuid, parentBUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(rootUuid, 'provider');
      kernel.createEntity(parentAUuid, 'parent');
      kernel.createEntity(parentBUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentAUuid);

      kernel.getEntity(rootUuid).provideGlobalContext('ctx').set('from-root');
      kernel.getEntity(parentAUuid).provideContext('ctx').set('from-a');
      kernel.getEntity(parentBUuid).provideContext('ctx').set('from-b');

      const inherited = kernel.getEntity(childUuid).useParentContext('ctx');

      await nextMicrotask();

      const seen: unknown[] = [];
      const effect = createEffect(() => {
        seen.push(inherited());
      });

      move(kernel, childUuid, parentBUuid);

      await nextMicrotask();

      effect.destroy();
      kernel.destroy();

      return seen;
    };

    it('does not show the root value to useParentContext() while an entity moves between parents', async () => {
      const seen = await collectInheritedWhileMoving((kernel, childUuid, parentBUuid) => {
        kernel.getEntity(childUuid).parent = kernel.getEntity(parentBUuid);
      });

      // the entity passes straight from one parent to the next: the value of the parent it leaves
      // stands until the one it joins takes over, and the root value is never in between
      expect(seen).toEqual(['from-a', 'from-b']);
    });

    it('does not show the root value to useParentContext() when the kernel reparents an entity', async () => {
      const seen = await collectInheritedWhileMoving((kernel, childUuid, parentBUuid) => {
        kernel.setParent(childUuid, parentBUuid);
      });

      // the same guarantee on the kernel path. The value is asserted rather than the exact number
      // of writes: this path re-establishes the binding once more after the attachment, and how
      // often it does so is not what this case is about
      expect(seen, 'no root value on the way').not.toContain('from-root');
      expect(seen.at(0), 'starts at the parent it leaves').toBe('from-a');
      expect(seen.at(-1), 'ends at the parent it joins').toBe('from-b');
    });

    it('binds a context created after the attachment to the parent', async () => {
      const kernel = makeKernel();
      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);

      kernel.getEntity(parentUuid).provideContext('ctx').set('from-parent');

      // the context comes into being while the child already hangs below the parent
      const consumer = kernel.getEntity(childUuid).useContext('ctx');

      await nextMicrotask();

      expect(value(consumer)).toBe('from-parent');

      kernel.destroy();
    });

    // Every provider of one context name feeds the same entity-side signal, so the value that
    // stands there is the one written last. `attachContextProvider()` keeps the feeds of a name
    // together and, when one of them is released, gives the name back to a feed that is still
    // attached and still holds something.
    it('attachContextProvider hands the context to the feed that stays when an earlier release runs', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      const providerA = createSignal('from-a');
      const providerB = createSignal('from-b');

      const releaseA = entity.attachContextProvider('ctx', providerA);
      entity.attachContextProvider('ctx', providerB);

      const provided = entity.provideContext('ctx');
      expect(value(provided), 'the feed attached last wrote last').toBe('from-b');

      // A write straight into the signal `provideContext()` hands out is not a feed, so the next
      // release overwrites it.
      provided.set('written-directly');

      releaseA();

      expect(value(provided)).toBe('from-b');

      kernel.destroy();
    });

    it('attachContextProvider leaves the last written value alone when no attached provider holds one', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      const provider = createSignal<string>();
      const release = entity.attachContextProvider('ctx', provider);

      const provided = entity.provideContext('ctx');
      provided.set('left-behind');

      release();

      expect(value(provided)).toBe('left-behind');

      kernel.destroy();
    });

    it('leaves no context behind when it is destroyed', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.useContext('theme');
      expect(entity.hasContext('theme')).toBe(true);

      kernel.destroyEntity(uuid);

      expect(entity.hasContext('theme')).toBe(false);
    });
  });

  describe('truthy property cache', () => {
    it('reports a property that setProperty() made truthy', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.setProperties([['a', 1]]);

      // reading fills the cache, which is what a later write has to invalidate
      expect(Array.from(entity.truthyProps()!)).toEqual(['a']);

      entity.setProperty('b', 1);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a', 'b']);

      kernel.destroy();
    });

    it('reports a property that setProperties() made truthy', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.setProperties([['a', 1]]);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a']);

      entity.setProperties([['b', 1]]);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a', 'b']);

      kernel.destroy();
    });

    it('drops a property that setProperty() made falsy', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.setProperties([
        ['a', 1],
        ['b', 1],
      ]);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a', 'b']);

      entity.setProperty('a', false);

      expect(Array.from(entity.truthyProps()!)).toEqual(['b']);

      kernel.destroy();
    });

    it('answers undefined while no property is truthy', () => {
      const kernel = makeKernel();
      const [emptyUuid, blankUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(emptyUuid, 'entity');
      kernel.createEntity(blankUuid, 'entity');

      const blank = kernel.getEntity(blankUuid);
      blank.setProperties([['a', '']]);

      // the contract is `undefined`, not an empty set: `Registry.findConstructors()` reads it as
      // `truthyProps?: Set<string>` and takes the absence as "this entity routes by token alone"
      expect(kernel.getEntity(emptyUuid).truthyProps(), 'an entity without properties').toBeUndefined();
      expect(blank.truthyProps(), 'an entity whose only property is the empty string').toBeUndefined();

      kernel.destroy();
    });
  });

  describe('children order', () => {
    it('sorts siblings by ascending order', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID()];
      const orders = [2, 0, 1];
      for (const [i, uuid] of uuids.entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, orders[i]);
      }

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([uuids[1], uuids[2], uuids[0]]);

      kernel.destroy();
    });

    it('keeps the attachment order among siblings that share an order', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
      const orders = [1, 0, 1, 0, 1];
      for (const [i, uuid] of uuids.entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, orders[i]);
      }

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([
        uuids[1],
        uuids[3],
        uuids[0],
        uuids[2],
        uuids[4],
      ]);

      kernel.destroy();
    });

    it('places a later child with a lower order in front of the ones already there', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID()];
      const orders = [0, 0, -1];
      for (const [i, uuid] of uuids.entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, orders[i]);
      }

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([uuids[2], uuids[0], uuids[1]]);

      kernel.destroy();
    });

    it('re-sorts the siblings when the order of one of them changes', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID()];
      for (const [i, uuid] of uuids.entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, i);
      }

      kernel.updateOrder(uuids[0], 10);

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([uuids[1], uuids[2], uuids[0]]);

      kernel.destroy();
    });

    it('sorts a child that arrives after the order of a sibling changed', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID()];
      for (const [i, uuid] of uuids.slice(0, 2).entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, i);
      }

      // the sibling list is re-sorted here, and the child that arrives afterwards has to land
      // against that new state -- an insertion reads the list it finds
      kernel.updateOrder(uuids[0], 10);
      kernel.createEntity(uuids[2], 'child', parentUuid, 5);

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([uuids[1], uuids[2], uuids[0]]);

      kernel.destroy();
    });

    it('moves a child behind its equals when the kernel gives it a new order under the same parent', () => {
      const kernel = makeKernel();
      const parentUuid = generateUUID();

      kernel.createEntity(parentUuid, 'parent');

      const uuids = [generateUUID(), generateUUID(), generateUUID()];
      const orders = [1, 2, 3];
      for (const [i, uuid] of uuids.entries()) {
        kernel.createEntity(uuid, 'child', parentUuid, orders[i]);
      }

      // the parent stays the same and only the order changes: the child is placed anew, which puts
      // it behind the sibling it now shares an order with
      kernel.setParent(uuids[0], parentUuid, 3);

      expect(kernel.getEntity(parentUuid).children.map((child) => child.uuid)).toEqual([uuids[1], uuids[2], uuids[0]]);

      kernel.destroy();
    });
  });

  describe('addChild', () => {
    it('rejects a child that is already among the children', () => {
      const kernel = makeKernel();
      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child');

      const parent = kernel.getEntity(parentUuid);
      const child = kernel.getEntity(childUuid);

      parent.addChild(child);

      expect(() => parent.addChild(child)).toThrow(/already exists/);

      kernel.destroy();
    });
  });

  describe('cycles in the entity tree', () => {
    it('refuses the entity itself as its own parent', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      expect(() => {
        entity.parent = entity;
      }).toThrow();

      expect(entity.children, 'the entity does not end up among its own children').toHaveLength(0);

      kernel.destroy();
    });

    it('refuses a parent that already sits below the entity', () => {
      const kernel = makeKernel();
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'parent');
      kernel.createEntity(bUuid, 'child', aUuid);

      const a = kernel.getEntity(aUuid);
      const b = kernel.getEntity(bUuid);

      expect(() => {
        a.parent = b;
      }).toThrow();

      kernel.destroy();
    });

    it('leaves the entity attached where it was when it refuses the new parent', () => {
      const kernel = makeKernel();
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'parent');
      kernel.createEntity(bUuid, 'child', aUuid);

      const a = kernel.getEntity(aUuid);
      const b = kernel.getEntity(bUuid);

      expect(() => {
        a.parent = b;
      }).toThrow();

      expect(b.parentUuid, 'the child stays below the parent it had').toBe(aUuid);
      expect(a.children).toHaveLength(1);
      expect(a.parentUuid, 'the refused entity is still a root').toBeUndefined();

      kernel.destroy();
    });
  });

  describe('traverse()', () => {
    it('visits the entity and its descendants once each', () => {
      const kernel = makeKernel();
      const [rUuid, aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(rUuid, 'root');
      kernel.createEntity(aUuid, 'child', rUuid);
      kernel.createEntity(bUuid, 'grandchild', aUuid);
      kernel.createEntity(cUuid, 'child', rUuid);

      const seen: string[] = [];
      kernel.getEntity(rUuid).traverse((entity) => {
        seen.push(entity.uuid);
      });

      // depth first, the parent ahead of its children
      expect(seen).toEqual([rUuid, aUuid, bUuid, cUuid]);

      kernel.destroy();
    });

    it('terminates when a children list points back at an ancestor', () => {
      const kernel = makeKernel();
      const [rUuid, aUuid, bUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(rUuid, 'root');
      kernel.createEntity(aUuid, 'child', rUuid);
      kernel.createEntity(bUuid, 'grandchild', aUuid);

      // `addChild()` writes a children list without touching the parent link, so the ring it lays
      // here is invisible to any check that walks the parent chain
      kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid));

      const seen: string[] = [];
      kernel.getEntity(rUuid).traverse((entity) => {
        seen.push(entity.uuid);
      });

      expect(seen).toEqual([rUuid, aUuid, bUuid]);

      kernel.destroy();
    });
  });

  describe('an entity that reports its place to the kernel', () => {
    it('becomes a root again when it is detached with removeFromParent()', () => {
      const kernel = makeKernel();
      const [rUuid, aUuid, bUuid, yUuid] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      // `r` carries `a` and `b`, and `b` carries `y`. The subtree under the detached entity is what
      // lets the two lists be told apart: a `b` that has climbed to the root set walks its own `y`
      // one level up and ahead of the `a` that stayed below `r`, which no cached list can show.
      kernel.createEntity(rUuid, 'r');
      kernel.createEntity(aUuid, 'a', rUuid);
      kernel.createEntity(bUuid, 'b', rUuid);
      kernel.createEntity(yUuid, 'y', bUuid);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid, yUuid]);

      kernel.getEntity(bUuid).removeFromParent();

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, bUuid, aUuid, yUuid]);
      expect(kernel.getEntityGraph().map((node) => node.entity.uuid)).toEqual([rUuid, bUuid]);

      kernel.destroy();
    });

    it('becomes a root again when the parent is written as undefined', () => {
      const kernel = makeKernel();
      const [rUuid, aUuid, bUuid, yUuid] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      // `r` carries `a` and `b`, and `b` carries `y`. The subtree under the detached entity is what
      // lets the two lists be told apart: a `b` that has climbed to the root set walks its own `y`
      // one level up and ahead of the `a` that stayed below `r`, which no cached list can show.
      kernel.createEntity(rUuid, 'r');
      kernel.createEntity(aUuid, 'a', rUuid);
      kernel.createEntity(bUuid, 'b', rUuid);
      kernel.createEntity(yUuid, 'y', bUuid);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid, yUuid]);

      kernel.getEntity(bUuid).parent = undefined;

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, bUuid, aUuid, yUuid]);
      expect(kernel.getEntityGraph().map((node) => node.entity.uuid)).toEqual([rUuid, bUuid]);

      kernel.destroy();
    });

    it('is torn down by the kernel after it has been detached', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      let destroyed = 0;

      registry.define(
        'b',
        class {
          [onDestroy]() {
            destroyed += 1;
          }
        },
      );

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid);

      kernel.getEntity(bUuid).removeFromParent();

      kernel.destroy();

      expect(destroyed).toBe(1);
    });

    it('drops the cached traversal when its order is written', () => {
      const kernel = makeKernel();
      const [pUuid, c1Uuid, c2Uuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(c1Uuid, 'c', pUuid, 0);
      kernel.createEntity(c2Uuid, 'c', pUuid, 1);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([pUuid, c1Uuid, c2Uuid]);

      kernel.getEntity(c1Uuid).order = 5;

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([pUuid, c2Uuid, c1Uuid]);

      kernel.destroy();
    });

    it('sends onParentChanged from Kernel.setParent() and from nowhere else', async () => {
      const kernel = makeKernel();
      const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(cUuid, 'c');

      let parentChanged = 0;
      on(kernel.getEntity(aUuid), onParentChanged, () => {
        parentChanged += 1;
      });

      kernel.getEntity(aUuid).parent = kernel.getEntity(bUuid);

      await nextMicrotask();

      expect(parentChanged, 'a write on the setter moves the entity without announcing it').toBe(0);

      kernel.setParent(aUuid, cUuid);

      await nextMicrotask();

      expect(parentChanged, 'the notification belongs to the kernel method').toBe(1);

      kernel.destroy();
    });
  });
});