import {on} from '@spearwolf/eventize';
import {createEffect, createSignal, Signal, value} from '@spearwolf/signalize';
import {describe, expect, it, vi} from 'vitest';
import {generateUUID} from '../utils/generateUUID.js';
import type {Entity} from './Entity.js';
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

    it('reports a property that a handed-out property writer made truthy', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.setProperties([['a', 1]]);

      // reading fills the cache, which is what a later write has to invalidate
      expect(Array.from(entity.truthyProps()!)).toEqual(['a']);

      entity.getPropertyWriter('b')(1);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a', 'b']);

      kernel.destroy();
    });

    it('drops a property that a handed-out property writer made falsy', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');
      const entity = kernel.getEntity(uuid);

      entity.setProperties([
        ['a', 1],
        ['b', 1],
      ]);

      expect(Array.from(entity.truthyProps()!)).toEqual(['a', 'b']);

      entity.getPropertyWriter('a')(false);

      expect(Array.from(entity.truthyProps()!)).toEqual(['b']);

      kernel.destroy();
    });

    it('routes to the shadow objects of a property written through a handed-out writer', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const uuid = generateUUID();

      class Directive {}

      registry.define('directive', Directive);
      registry.appendRoute('@plah', ['directive']);

      // the creation resolves the constructor set and fills the cache on its way
      kernel.createEntity(uuid, 'entity');

      expect(kernel.findShadowObjects(uuid), 'nothing routes to this entity yet').toHaveLength(0);

      kernel.getEntity(uuid).getPropertyWriter('plah')('hello');

      // an empty property change writes nothing and re-resolves the constructor set, so what the
      // registry gets to see is exactly what the cache answers
      kernel.changeProperties(uuid, []);

      expect(kernel.findShadowObjects(uuid)).toHaveLength(1);
      expect(kernel.findShadowObjects(uuid)[0]).toBeInstanceOf(Directive);

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

      const uuids: [string, string, string] = [generateUUID(), generateUUID(), generateUUID()];
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

      const uuids: [string, string, string] = [generateUUID(), generateUUID(), generateUUID()];
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

      const uuids: [string, string, string] = [generateUUID(), generateUUID(), generateUUID()];
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
      expect(b.parent?.uuid, 'and answers with it by entity too').toBe(aUuid);
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

  describe('the parent link', () => {
    it('answers by entity and by uuid alike while it is written and rewritten', () => {
      const kernel = makeKernel();
      const [pUuid, qUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(qUuid, 'q');
      kernel.createEntity(cUuid, 'c');

      const c = kernel.getEntity(cUuid);

      expect(c.parent, 'no parent yet').toBeUndefined();
      expect(c.parentUuid, 'no parent yet').toBeUndefined();
      expect(c.hasParent, 'no parent yet').toBe(false);

      c.parentUuid = pUuid;

      expect(c.parent?.uuid).toBe(pUuid);
      expect(c.parentUuid).toBe(pUuid);
      expect(c.hasParent).toBe(true);

      c.parent = kernel.getEntity(qUuid);

      expect(c.parent?.uuid).toBe(qUuid);
      expect(c.parentUuid).toBe(qUuid);
      expect(c.hasParent).toBe(true);

      c.parent = undefined;

      expect(c.parent).toBeUndefined();
      expect(c.parentUuid).toBeUndefined();
      expect(c.hasParent).toBe(false);

      kernel.destroy();
    });

    it('agrees by parent and by uuid that it is gone when the entity is detached', () => {
      const kernel = makeKernel();
      const [pUuid, cUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(cUuid, 'c', pUuid);

      const c = kernel.getEntity(cUuid);
      c.removeFromParent();

      expect(c.parent).toBeUndefined();
      expect(c.parentUuid).toBeUndefined();
      expect(c.hasParent).toBe(false);
      expect(kernel.getEntityGraph().map((node) => node.entity.uuid)).toContain(cUuid);

      kernel.destroy();
    });

    it('agrees by parent and by uuid that it is gone when the parent is destroyed', () => {
      const kernel = makeKernel();
      const [pUuid, cUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(cUuid, 'c', pUuid);

      kernel.destroyEntity(pUuid);

      const c = kernel.getEntity(cUuid);

      expect(c.parent).toBeUndefined();
      expect(c.parentUuid).toBeUndefined();
      expect(c.hasParent).toBe(false);
      expect(kernel.getEntityGraph().map((node) => node.entity.uuid)).toContain(cUuid);

      kernel.destroy();
    });

    it('agrees by parent and by uuid while the kernel moves the entity', () => {
      const kernel = makeKernel();
      const [pUuid, qUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(qUuid, 'q');
      kernel.createEntity(cUuid, 'c', pUuid);

      const c = kernel.getEntity(cUuid);

      kernel.setParent(cUuid, qUuid);

      expect(c.parent?.uuid).toBe(qUuid);
      expect(c.parentUuid).toBe(qUuid);
      expect(c.hasParent).toBe(true);

      kernel.setParent(cUuid, undefined);

      expect(c.parent).toBeUndefined();
      expect(c.parentUuid).toBeUndefined();
      expect(c.hasParent).toBe(false);

      kernel.destroy();
    });

    it('agrees by parent and by uuid that the old edge stands when an unknown parent uuid is refused', () => {
      const kernel = makeKernel();
      const [pUuid, cUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(cUuid, 'c', pUuid);

      const c = kernel.getEntity(cUuid);

      expect(() => {
        c.parentUuid = 'no-such-entity';
      }).toThrow();

      expect(c.parent?.uuid, 'the old edge stands, by entity').toBe(pUuid);
      expect(c.parentUuid, 'the old edge stands, by uuid').toBe(pUuid);
      expect(c.hasParent).toBe(true);

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

    it('delivers the parent change before setParent() returns', () => {
      const kernel = makeKernel();
      const [aUuid, pUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(pUuid, 'p');

      let parentChanged = 0;
      on(kernel.getEntity(aUuid), onParentChanged, () => {
        parentChanged += 1;
      });

      kernel.setParent(aUuid, pUuid);

      expect(parentChanged).toBe(1);

      kernel.destroy();
    });

    it('delivers the parent change of an entity destroyed in the same task', async () => {
      const kernel = makeKernel();
      const [aUuid, pUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(pUuid, 'p');

      let parentChanged = 0;
      on(kernel.getEntity(aUuid), onParentChanged, () => {
        parentChanged += 1;
      });

      kernel.setParent(aUuid, pUuid);
      kernel.destroyEntity(aUuid);

      await nextMicrotask();

      expect(parentChanged).toBe(1);

      kernel.destroy();
    });

    it('reports a handler that throws instead of carrying it to the caller', () => {
      const kernel = makeKernel();
      const [aUuid, pUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(pUuid, 'p');

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      on(kernel.getEntity(aUuid), onParentChanged, () => {
        throw new Error('handler fails');
      });

      expect(() => kernel.setParent(aUuid, pUuid)).not.toThrow();

      expect(consoleError).toHaveBeenCalledTimes(1);
      const args = consoleError.mock.calls[0];
      expect(args).toContain('entity onParentChanged notification failed:');
      expect(args).toContain(aUuid);

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('hands the handler its new position through useParentContext() inline, its own settled context one microtask behind', async () => {
      const kernel = makeKernel();
      const [aUuid, p1Uuid, p2Uuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(p1Uuid, 'p1');
      kernel.createEntity(p2Uuid, 'p2');

      kernel.getEntity(p1Uuid).provideContext('ctx').set('from-p1');
      kernel.getEntity(p2Uuid).provideContext('ctx').set('from-p2');

      // Attached to `p1` and settled before the case starts: `#subscribeToParent()` links
      // `useParentContext()` straight to the parent's own context signal, which updates the link
      // the moment the parent is set -- one microtask carries that into `useContext()`, the reader
      // this case also wants settled going in, so the transition below is the only open question.
      kernel.setParent(aUuid, p1Uuid);
      await nextMicrotask();

      const child = kernel.getEntity(aUuid);
      const inherited = child.useParentContext('ctx');
      const ownContext = child.useContext('ctx');
      await nextMicrotask();

      let seenParent: string | undefined;
      let seenInherited: unknown;
      let seenOwnContext: unknown;
      on(child, onParentChanged, (entity: Entity) => {
        seenParent = entity.parent?.uuid;
        seenInherited = value(inherited);
        seenOwnContext = value(ownContext);
      });

      kernel.setParent(aUuid, p2Uuid);

      expect(seenParent).toBe(p2Uuid);

      // `useParentContext()` is a direct link to the parent's own context signal, rebound
      // synchronously inside `setParent()` before the notification goes out -- so it already names
      // `p2` at the delivery point.
      expect(seenInherited, 'useParentContext() already names the new parent inline').toBe('from-p2');

      // `useContext()` runs through `deferContextValueUpdate()`, a one-microtask batch collector of
      // its own: the entity's own settled context still names the parent it is leaving at the moment
      // the handler runs, and only catches up one microtask later.
      expect(seenOwnContext, 'useContext() still names the value the entity leaves behind').toBe('from-p1');

      await nextMicrotask();

      expect(value(inherited)).toBe('from-p2');
      expect(value(ownContext)).toBe('from-p2');

      kernel.destroy();
    });
  });

  describe('a context value whose reader throws', () => {
    // `Signal.set()` runs the effects of a signal synchronously and re-throws what one of them
    // threw, so a reader that fails does so inside the round that hands the context values over.
    // That is the shape both cases below are built on.
    const armedThrower = (read: () => unknown) => {
      let armed = false;

      // `createEffect()` runs its callback right away, and a throw from that first run would leave
      // through this line rather than through the hand-over the cases are about.
      createEffect(() => {
        read();
        if (armed) throw new Error('a context reader fails');
      });

      armed = true;
    };

    it('costs no other entity of the same kernel its value', async () => {
      const kernel = makeKernel();
      const [failingUuid, healthyUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(failingUuid, 'failing');
      kernel.createEntity(healthyUuid, 'healthy');

      const failing = kernel.getEntity(failingUuid);
      const healthy = kernel.getEntity(healthyUuid);

      // The failing entity takes its context first, so its value stands ahead of the other one in
      // the round: what this case is about is the entity waiting behind it.
      armedThrower(failing.useContext('ctx'));
      const healthyConsumer = healthy.useContext('ctx');

      const errors = vi.spyOn(kernel.logger, 'error').mockImplementation(() => {});

      failing.provideContext('ctx').set('for the failing reader');
      healthy.provideContext('ctx').set('for the healthy reader');

      await nextMicrotask();

      expect(value(healthyConsumer), 'the entity behind the failing one still gets its value').toBe('for the healthy reader');
      expect(errors, 'the failure names the context and the entity').toHaveBeenCalledWith(
        expect.stringContaining('ctx'),
        failingUuid,
        expect.any(Error),
      );
      expect(errors, 'and it is reported once').toHaveBeenCalledTimes(1);

      kernel.destroy();
      errors.mockRestore();
    });

    it('is reported to the kernel it happened in and leaves the other one alone', async () => {
      const failingKernel = makeKernel();
      const otherKernel = makeKernel();
      const [failingUuid, otherUuid] = [generateUUID(), generateUUID()];

      failingKernel.createEntity(failingUuid, 'failing');
      otherKernel.createEntity(otherUuid, 'other');

      const failing = failingKernel.getEntity(failingUuid);
      const other = otherKernel.getEntity(otherUuid);

      armedThrower(failing.useContext('ctx'));
      const otherConsumer = other.useContext('ctx');

      const failingErrors = vi.spyOn(failingKernel.logger, 'error').mockImplementation(() => {});
      const otherErrors = vi.spyOn(otherKernel.logger, 'error').mockImplementation(() => {});

      // A single collector shared by every Shadow Environment would fold both writes into the same
      // scheduling flag and hand them over on one microtask; a guard around each entry would make that
      // pass just as well as the per-Kernel collector this exercises. So the count below is what tells
      // them apart: each Kernel schedules its own hand-over independently of what the other is doing.
      const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

      failing.provideContext('ctx').set('for the failing reader');
      other.provideContext('ctx').set('for the other kernel');

      expect(queueMicrotaskSpy, 'each kernel schedules its own hand-over').toHaveBeenCalledTimes(2);
      queueMicrotaskSpy.mockRestore();

      await nextMicrotask();

      expect(value(otherConsumer), 'the other kernel hands its own values over').toBe('for the other kernel');
      expect(failingErrors, 'the kernel the reader lives in reports it').toHaveBeenCalledTimes(1);
      expect(otherErrors, 'the other kernel has nothing to report').not.toHaveBeenCalled();

      failingKernel.destroy();
      otherKernel.destroy();
      failingErrors.mockRestore();
      otherErrors.mockRestore();
    });
  });

  describe('a release with a step that throws', () => {
    // `Signal.prototype.destroy` stands in for a step deep inside the release that this test cannot
    // reach any other way -- the context entries it walks are private state, reachable only through
    // the signals the entity itself hands out. Patching the shared prototype reaches every signal the
    // entity destroys in one release, which is the point: several of the guarded steps fail at once,
    // and what is left standing afterwards is what the case is about.
    it('still reaches the steps behind the one that throws', () => {
      const kernel = makeKernel();
      const [parentUuid, childUuid, grandchildUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);
      kernel.createEntity(grandchildUuid, 'grandchild', childUuid);

      const child = kernel.getEntity(childUuid);

      // A context entry gives the release something to walk over: `useContext()` creates one, with
      // three signals of its own (`inherited`, `provide`, `context`).
      child.useContext('ctx');

      const errors = vi.spyOn(kernel.logger, 'error').mockImplementation(() => {});
      const originalDestroy = Signal.prototype.destroy;
      Signal.prototype.destroy = function destroyFails() {
        throw new Error('signal destroy fails');
      };

      try {
        expect(() => (child as unknown as {[onDestroy](): void})[onDestroy]()).not.toThrow();
      } finally {
        Signal.prototype.destroy = originalDestroy;
      }

      expect(child.children, 'the children are released regardless of the failing signals').toEqual([]);
      expect(child.parent, 'the parent link is released regardless of the failing signals').toBeUndefined();
      // Four of the seven context-loop steps reach a `Signal.destroy()` call: `valuePath.dispose()`
      // through `value$`, then `inherited`, `provide` and `context` directly. `context.set()`,
      // `unsubscribePathValue()` and `unsubscribeFromParent()` never call it.
      const steps = errors.mock.calls.map(([message]) => message).sort();
      expect(steps, 'every failing step is reported by its own name').toEqual([
        'entity teardown step failed (context signal):',
        'entity teardown step failed (context value path):',
        'entity teardown step failed (inherited context signal):',
        'entity teardown step failed (provided context signal):',
      ]);

      errors.mockRestore();
      kernel.destroy();
    });

    it('reaches the steps behind a failing property signal cleanup', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'withThrowingPropCleanup', undefined, 0, [['label', 'hello']]);

      const entity = kernel.getEntity(uuid);
      const childUuid = generateUUID();
      kernel.createEntity(childUuid, 'child', uuid);

      // An effect that reads the property leaves a cleanup behind. Destroying the property's signal
      // runs that cleanup, and a throw from it is what `SignalAutoMap.clear()` re-raises once every
      // entry is gone -- the failure this step of the release has to survive.
      createEffect(() => {
        entity.getPropertyReader('label')();
        return () => {
          throw new Error('property cleanup fails');
        };
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => (entity as unknown as {[onDestroy](): void})[onDestroy]()).not.toThrow();

      expect(entity.propEntries(), 'the properties are cleared regardless of the failing cleanup').toEqual([]);
      expect(entity.children, 'the steps behind the failing one still run').toEqual([]);
      expect(consoleError, 'the failure is reported').toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });
  });
});
