import {afterEach, describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import type {Entity} from './Entity.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

// A chain r -> a -> b under one kernel. The breadth-first order over it is exactly the order the
// three entities are created in, which makes a reversed result easy to tell apart from a fresh one.
const makeEntityChain = (kernel: Kernel) => {
  const uuids: [string, string, string] = [generateUUID(), generateUUID(), generateUUID()];

  kernel.createEntity(uuids[0], 'node');
  kernel.createEntity(uuids[1], 'node', uuids[0]);
  kernel.createEntity(uuids[2], 'node', uuids[1]);

  return uuids;
};

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('re-parenting maintains autoDestructionOnParentRemoval subscription', () => {
    it('child re-parented away survives destruction of the original parent', () => {
      const kernel = new Kernel(new Registry());

      const [parentAUuid, parentBUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentAUuid, 'pA');
      kernel.createEntity(parentBUuid, 'pB');
      kernel.createEntity(childUuid, 'c', parentAUuid, 0, undefined, true);

      kernel.setParent(childUuid, parentBUuid);

      kernel.destroyEntity(parentAUuid);

      expect(kernel.hasEntity(childUuid), 'child should survive destruction of original parent').toBe(true);
    });

    it('child re-parented to a new parent is destroyed when the new parent is destroyed', () => {
      const kernel = new Kernel(new Registry());

      const [parentAUuid, parentBUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentAUuid, 'pA');
      kernel.createEntity(parentBUuid, 'pB');
      kernel.createEntity(childUuid, 'c', parentAUuid, 0, undefined, true);

      kernel.setParent(childUuid, parentBUuid);

      kernel.destroyEntity(parentBUuid);

      expect(kernel.hasEntity(childUuid), 'child should be destroyed with new parent').toBe(false);
    });
  });

  describe('BFS cache is invalidated on programmatic destruction', () => {
    it('traverseLevelOrderBFS does not return stale entities after auto-destruct cascade', () => {
      const kernel = new Kernel(new Registry());

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'p');
      kernel.createEntity(childUuid, 'c', parentUuid, 0, undefined, true);

      // prime the BFS cache
      const before = kernel.traverseLevelOrderBFS();
      expect(before.map((e) => e.uuid)).toEqual(expect.arrayContaining([parentUuid, childUuid]));

      kernel.destroyEntity(parentUuid);

      // BFS must reflect that both entities are gone (not return cached/stale entries)
      const after = kernel.traverseLevelOrderBFS();
      expect(after.map((e) => e.uuid)).not.toContain(parentUuid);
      expect(after.map((e) => e.uuid)).not.toContain(childUuid);
    });
  });

  describe('setParent with unknown UUID does not orphan the entity', () => {
    it('Kernel.setParent with non-existent parent UUID throws and preserves the original parent link', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];
      const ghostUuid = generateUUID();

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid);

      expect(kernel.getEntity(bUuid).parentUuid).toBe(aUuid);

      expect(() => kernel.setParent(bUuid, ghostUuid)).toThrow();

      expect(kernel.getEntity(bUuid).parentUuid, 'child must keep its original parent').toBe(aUuid);
      expect(
        kernel.getEntity(aUuid).children.map((c) => c.uuid),
        'parent must still know its child',
      ).toContain(bUuid);
    });

    it('Entity.parentUuid setter with non-existent UUID throws and preserves the original parent link', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];
      const ghostUuid = generateUUID();

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid);

      const b = kernel.getEntity(bUuid);
      expect(b.parentUuid).toBe(aUuid);

      expect(() => {
        b.parentUuid = ghostUuid;
      }).toThrow();

      expect(b.parentUuid, 'child must keep its original parent').toBe(aUuid);
      expect(kernel.getEntity(aUuid).children.map((c) => c.uuid)).toContain(bUuid);
    });
  });

  describe('setParent without an order keeps the current one', () => {
    it('re-parenting an entity does not reset its order to 0', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(cUuid, 'c', aUuid, 5);

      expect(kernel.getEntity(cUuid).order).toBe(5);

      // a SetParent change only carries an order when it changed — this is the change trail
      // that ComponentChanges.makeSetParentChange() produces for an unchanged order
      kernel.setParent(cUuid, bUuid);

      expect(kernel.getEntity(cUuid).parentUuid).toBe(bUuid);
      expect(kernel.getEntity(cUuid).order, 'the order must survive a re-parent').toBe(5);
    });

    it('an explicit order still wins', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid, 5);

      kernel.setParent(bUuid, aUuid, 0);

      expect(kernel.getEntity(bUuid).order).toBe(0);
    });
  });

  describe('traverseLevelOrderBFS', () => {
    it('hands out a fresh array on every call', () => {
      const kernel = new Kernel(new Registry());
      makeEntityChain(kernel);

      expect(kernel.traverseLevelOrderBFS()).not.toBe(kernel.traverseLevelOrderBFS());

      kernel.destroy();
    });

    it('keeps its own order when a caller reverses the array it got', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      const before = kernel.traverseLevelOrderBFS().map((e) => e.uuid);
      expect(before).toEqual([rUuid, aUuid, bUuid]);

      kernel.traverseLevelOrderBFS().reverse();

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual(before);

      kernel.destroy();
    });

    it('upgrades the entities from the root down after a caller reversed an earlier result', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const created: string[] = [];

      @ShadowObject({registry, token: 'node'})
      class FirstRecorder implements OnCreate {
        [onCreate](entity: Entity) {
          created.push(entity.uuid);
        }
      }
      expect(FirstRecorder).toBeDefined();

      const [rUuid] = makeEntityChain(kernel);

      created.length = 0;

      // Nothing between this line and the upgrade may change the entity tree: a structural change
      // rebuilds the cache and would make the case pass for the wrong reason.
      kernel.traverseLevelOrderBFS().reverse();

      // a second constructor for the same token is what gives the upgrade something to create
      @ShadowObject({registry, token: 'node'})
      class SecondRecorder implements OnCreate {
        [onCreate](entity: Entity) {
          created.push(entity.uuid);
        }
      }
      expect(SecondRecorder).toBeDefined();

      kernel.upgradeEntities();

      expect(created.at(0), 'a shadow object reaches the parent before it reaches the child').toBe(rUuid);

      kernel.destroy();
    });

    it('terminates when a children list points back at an ancestor', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      // `addChild()` writes a children list without touching the parent link, so no ancestor check
      // on the parent path can cover the ring it lays here
      kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid));

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid]);

      kernel.destroy();
    });

    it('drops a child the kernel no longer holds', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      const looseUuid = generateUUID();
      kernel.createEntity(looseUuid, 'node');

      // `addChild()` writes a children list without touching the parent link, so the detachment
      // inside `destroyEntity()` finds nothing to cut and the list keeps the name afterwards
      kernel.getEntity(aUuid).addChild(kernel.getEntity(looseUuid));
      kernel.destroyEntity(looseUuid);

      expect(
        kernel.getEntity(aUuid).children.map((e) => e.uuid),
        'the children list still names the entity the kernel let go',
      ).toEqual([bUuid, looseUuid]);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid]);

      kernel.destroy();
    });
  });

  describe('getEntityGraph', () => {
    it('terminates when a children list points back at an ancestor', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      // the ring the debugging tool is most likely to be pointed at
      kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid));

      const graph = kernel.getEntityGraph();

      expect(graph.map((node) => node.entity.uuid)).toEqual([rUuid]);
      expect(graph[0]!.children.map((node) => node.entity.uuid)).toEqual([aUuid]);
      expect(graph[0]!.children[0]!.children.map((node) => node.entity.uuid)).toEqual([bUuid]);
      expect(
        graph[0]!.children[0]!.children[0]!.children,
        'the entity that is already in the graph is not written twice',
      ).toEqual([]);
      expect(
        graph[0]!.children[0]!.children[0]!.omittedChildren,
        'the node names the back-edge instead of staying silent about it',
      ).toEqual([{uuid: aUuid, reason: 'already-in-graph'}]);

      kernel.destroy();
    });

    it('names a child the kernel no longer holds', () => {
      const kernel = new Kernel(new Registry());
      const rUuid = generateUUID();
      const aUuid = generateUUID();
      const xUuid = generateUUID();
      kernel.createEntity(rUuid, 'node');
      kernel.createEntity(aUuid, 'node', rUuid);
      kernel.createEntity(xUuid, 'node');

      // writes the children list without the parent link `removeFromParent()` follows
      kernel.getEntity(aUuid).addChild(kernel.getEntity(xUuid));
      kernel.destroyEntity(xUuid);

      const graph = kernel.getEntityGraph();

      expect(
        graph.map((node) => node.entity.uuid),
        'the destroyed entity is gone from the roots too',
      ).toEqual([rUuid]);
      const aNode = graph[0]!.children[0]!;
      expect(aNode.entity.uuid).toBe(aUuid);
      expect(aNode.children, 'the entity the kernel no longer holds drops out of the children').toEqual([]);
      expect(aNode.omittedChildren, 'the drop is named instead of silent').toEqual([{uuid: xUuid, reason: 'not-in-kernel'}]);

      kernel.destroy();
    });

    it('names the same missing child at every parent that lists it', () => {
      const kernel = new Kernel(new Registry());
      const rUuid = generateUUID();
      const aUuid = generateUUID();
      const bUuid = generateUUID();
      const xUuid = generateUUID();
      kernel.createEntity(rUuid, 'node');
      kernel.createEntity(aUuid, 'node', rUuid);
      kernel.createEntity(bUuid, 'node', rUuid);
      kernel.createEntity(xUuid, 'node');

      kernel.getEntity(aUuid).addChild(kernel.getEntity(xUuid));
      kernel.getEntity(bUuid).addChild(kernel.getEntity(xUuid));
      kernel.destroyEntity(xUuid);

      const graph = kernel.getEntityGraph();
      const [aNode, bNode] = graph[0]!.children;

      expect(aNode!.omittedChildren, 'the visited guard does not shadow the kernel-lookup guard for the second parent').toEqual([
        {uuid: xUuid, reason: 'not-in-kernel'},
      ]);
      expect(bNode!.omittedChildren).toEqual([{uuid: xUuid, reason: 'not-in-kernel'}]);

      kernel.destroy();
    });

    it('leaves omittedChildren off a node over a healthy tree', () => {
      const kernel = new Kernel(new Registry());
      makeEntityChain(kernel);

      const graph = kernel.getEntityGraph();

      const walk = (nodes: ReturnType<typeof kernel.getEntityGraph>): void => {
        for (const node of nodes) {
          expect('omittedChildren' in node, 'the key is absent, not present with an empty array').toBe(false);
          walk(node.children);
        }
      };
      walk(graph);

      kernel.destroy();
    });
  });

  describe('cycles in the entity tree', () => {
    it('refuses a setParent() that would put an entity below its own descendant', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, , cUuid] = makeEntityChain(kernel);

      expect(() => kernel.setParent(aUuid, cUuid)).toThrow();

      kernel.destroy();
    });

    it('leaves the entity where it was when it refuses the new parent', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid, cUuid] = makeEntityChain(kernel);

      kernel.updateOrder(cUuid, 3);

      expect(() => kernel.setParent(aUuid, cUuid)).toThrow();

      expect(kernel.getEntity(aUuid).parentUuid, 'the refused entity is still a root').toBeUndefined();
      expect(kernel.getEntity(bUuid).parentUuid).toBe(aUuid);
      expect(kernel.getEntity(cUuid).parentUuid).toBe(bUuid);
      expect(kernel.getEntity(cUuid).order).toBe(3);
      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid, bUuid, cUuid]);

      kernel.destroy();
    });
  });

  describe('the entity tree bookkeeping follows every route that changes it', () => {
    it('takes an entity created under a parent outside a change trail into the traversal', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');

      // The cached traversal is what the case is about, so it has to stand before the creation.
      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid]);

      kernel.createEntity(bUuid, 'b', aUuid);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid, bUuid]);

      kernel.destroy();
    });

    it('takes an entity created without a parent outside a change trail into the traversal', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      expect(kernel.traverseLevelOrderBFS()).toEqual([]);

      kernel.createEntity(uuid, 'a');

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([uuid]);
      expect(kernel.getEntityGraph().map((node) => node.entity.uuid)).toEqual([uuid]);

      kernel.destroy();
    });

    it('rebuilds the traversal after a setParent outside a change trail', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      // `b` before `a`, so the walk over two roots hands out an order the attached tree does not.
      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(aUuid, 'a');

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([bUuid, aUuid]);

      kernel.setParent(bUuid, aUuid);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid, bUuid]);

      const graph = kernel.getEntityGraph();
      expect(graph.map((node) => node.entity.uuid)).toEqual([aUuid]);
      expect(graph[0]!.children.map((node) => node.entity.uuid)).toEqual([bUuid]);

      kernel.destroy();
    });

    it('rebuilds the traversal after an updateOrder outside a change trail', () => {
      const kernel = new Kernel(new Registry());
      const [pUuid, c1Uuid, c2Uuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(pUuid, 'p');
      kernel.createEntity(c1Uuid, 'c', pUuid, 0);
      kernel.createEntity(c2Uuid, 'c', pUuid, 1);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([pUuid, c1Uuid, c2Uuid]);

      kernel.updateOrder(c1Uuid, 5);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([pUuid, c2Uuid, c1Uuid]);

      kernel.destroy();
    });

    it('gives an entity created by a shadow-object constructor the shadow-objects of a later token definition', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      let childShadowObjects = 0;

      registry.define(
        'parent',
        class {
          constructor(api: ShadowObjectCreationAPI) {
            api.entity.kernel.createEntity(childUuid, 'child', api.entity.uuid);
          }
        },
      );

      // A kernel that has already answered a traversal is the state the case needs: the creation
      // below has to reach the cache on its own, with no change trail behind it to do that for it.
      expect(kernel.traverseLevelOrderBFS()).toEqual([]);

      kernel.createEntity(parentUuid, 'parent');

      registry.define(
        'child',
        class {
          constructor() {
            childShadowObjects += 1;
          }
        },
      );

      kernel.upgradeEntities();

      expect(childShadowObjects).toBe(1);

      kernel.destroy();
    });

    it('tears down an entity created by a shadow-object constructor when the kernel is destroyed', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      let childDestroyed = 0;

      registry.define(
        'child',
        class implements OnDestroy {
          [onDestroy]() {
            childDestroyed += 1;
          }
        },
      );

      registry.define(
        'parent',
        class {
          constructor(api: ShadowObjectCreationAPI) {
            api.entity.kernel.createEntity(childUuid, 'child', api.entity.uuid);
          }
        },
      );

      expect(kernel.traverseLevelOrderBFS()).toEqual([]);

      kernel.createEntity(parentUuid, 'parent');

      kernel.destroy();

      expect(childDestroyed).toBe(1);
    });

    it('moves an entity in the kernel when the parent link is written on the entity itself', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      // `b` before `a` again: with both standing as roots the walk starts at `b`, so the expected
      // order can only come out of a root set that knows about the attachment.
      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(aUuid, 'a');

      kernel.getEntity(bUuid).parent = kernel.getEntity(aUuid);

      const graph = kernel.getEntityGraph();
      expect(graph.map((node) => node.entity.uuid)).toEqual([aUuid]);
      expect(graph[0]!.children.map((node) => node.entity.uuid)).toEqual([bUuid]);

      const traversed = kernel.traverseLevelOrderBFS().map((e) => e.uuid);
      expect(traversed).toEqual([aUuid, bUuid]);

      kernel.destroy();
    });

    it('moves an entity in the kernel when the parent uuid is written on the entity itself', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(aUuid, 'a');

      kernel.getEntity(bUuid).parentUuid = aUuid;

      const graph = kernel.getEntityGraph();
      expect(graph.map((node) => node.entity.uuid)).toEqual([aUuid]);
      expect(graph[0]!.children.map((node) => node.entity.uuid)).toEqual([bUuid]);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid, bUuid]);

      kernel.destroy();
    });
  });
});
