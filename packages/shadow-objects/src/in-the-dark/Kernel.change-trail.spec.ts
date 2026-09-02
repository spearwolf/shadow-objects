import {on} from '@spearwolf/eventize';
import {createSignal, destroySignal} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChangeTrailRefusedError} from '../ChangeTrailRefusedError.js';
import {ChangeTrailPhase, ComponentChangeType} from '../constants.js';
import type {IComponentChangeType, ICreateEntitiesChange, ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {ComponentChanges} from '../view/ComponentChanges.js';
import {type OnCreate, onCreate, onParentChanged} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('autoDestructionOnParentRemoval flows through change trail', () => {
    it('ComponentChanges.create() carries the autoDestructionOnParentRemoval flag in the trail entry', () => {
      const uuid = generateUUID();
      const parentUuid = generateUUID();

      const changes = new ComponentChanges(uuid);
      changes.create('testToken', parentUuid, 0, true);

      const trail: ICreateEntitiesChange[] = [];
      changes.buildChangeTrail(trail as any, ChangeTrailPhase.StructuralChanges);

      expect(trail).toHaveLength(1);
      expect(trail[0]).toMatchObject({
        type: ComponentChangeType.CreateEntities,
        uuid,
        token: 'testToken',
        parentUuid,
        autoDestructionOnParentRemoval: true,
      });
    });

    it('ComponentChanges.create() omits the flag when false (default)', () => {
      const uuid = generateUUID();

      const changes = new ComponentChanges(uuid);
      changes.create('testToken');

      const trail: ICreateEntitiesChange[] = [];
      changes.buildChangeTrail(trail as any, ChangeTrailPhase.StructuralChanges);

      expect(trail[0]).not.toHaveProperty('autoDestructionOnParentRemoval');
    });

    it('Kernel.run() applies autoDestructionOnParentRemoval from a CreateEntities trail entry', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyCallback = vi.fn();

      @ShadowObject({registry, token: 'testKern1'})
      class TestKern1 {
        constructor({onDestroy: register, entity}: ShadowObjectCreationAPI) {
          register(() => destroyCallback(entity.uuid));
        }
      }
      expect(TestKern1).toBeDefined();

      const parentUuid = generateUUID();
      const childUuid = generateUUID();

      kernel.run({
        changeTrail: [
          {
            type: ComponentChangeType.CreateEntities,
            uuid: parentUuid,
            token: 'testKern1',
          },
          {
            type: ComponentChangeType.CreateEntities,
            uuid: childUuid,
            token: 'testKern1',
            parentUuid,
            autoDestructionOnParentRemoval: true,
          } as ICreateEntitiesChange,
        ],
      });

      expect(kernel.getEntity(childUuid).autoDestructionOnParentRemoval).toBe(true);

      kernel.destroyEntity(parentUuid);

      expect(destroyCallback).toHaveBeenCalledWith(childUuid);
      expect(destroyCallback).toHaveBeenCalledWith(parentUuid);
    });
  });

  describe('entity lookup and the change trail', () => {
    it('findEntity() answers with the entity behind a uuid it holds', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');

      expect(kernel.findEntity(uuid)).toBe(kernel.getEntity(uuid));

      kernel.destroy();
    });

    it('findEntity() answers undefined for a uuid it does not hold', () => {
      const kernel = new Kernel(new Registry());

      expect(kernel.findEntity(generateUUID())).toBeUndefined();

      kernel.destroy();
    });

    // Both calls describe the entity tree, so both name an entity the view believes to be there:
    // a uuid the kernel does not hold is a disagreement, and the caller has to hear about it.
    it('getEntity() and changeProperties() throw for a uuid the kernel does not hold', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      expect(() => kernel.getEntity(uuid)).toThrow(/not found/);
      expect(() => kernel.changeProperties(uuid, [['a', 1]])).toThrow(/not found/);

      kernel.destroy();
    });

    // An event carries no structure, and the entity it was meant for may have been torn down
    // between the two sides.
    it('dispatchEventsToEntity() ignores events for an entity the kernel does not hold', () => {
      const kernel = new Kernel(new Registry());

      expect(() => kernel.dispatchEventsToEntity(generateUUID(), [{type: 'ping', data: 1}])).not.toThrow();

      kernel.destroy();
    });

    it('run() applies the entries behind a send-events entry for an entity that is gone', () => {
      const kernel = new Kernel(new Registry());
      const lateUuid = generateUUID();

      expect(() =>
        kernel.run({
          changeTrail: [
            {type: ComponentChangeType.SendEvents, uuid: generateUUID(), events: [{type: 'ping', data: 1}]},
            {type: ComponentChangeType.CreateEntities, uuid: lateUuid, token: 'late'},
          ],
        }),
      ).not.toThrow();

      // the entry behind the stray event is what this case is about: a single event for an
      // entity that is gone must not cost the rest of the change trail
      expect(kernel.hasEntity(lateUuid)).toBe(true);

      kernel.destroy();
    });

    it('applies a property entry that names only its key', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.run({
        changeTrail: [
          {type: ComponentChangeType.CreateEntities, uuid, token: 'node', properties: [['bare']]},
          {type: ComponentChangeType.ChangeProperties, uuid, properties: [['second']]},
        ],
      });

      const entity = kernel.getEntity(uuid);

      expect(entity.propKeys()).toContain('bare');
      expect(entity.propKeys()).toContain('second');
      expect(entity.getProperty('bare')).toBeUndefined();
      expect(entity.getProperty('second')).toBeUndefined();

      kernel.destroy();
    });
  });

  describe('a change trail the kernel cannot apply in full', () => {
    // Five entries, and the third one names a parent no entity stands behind. The two ahead of it
    // are plain creations, the two behind it as well -- so the kernel state alone says where the
    // trail stopped.
    const makeTrail = (uuids: [string, string, string, string]): IComponentChangeType[] => [
      {type: ComponentChangeType.CreateEntities, uuid: uuids[0], token: 'node'},
      {type: ComponentChangeType.CreateEntities, uuid: uuids[1], token: 'node'},
      {type: ComponentChangeType.SetParent, uuid: uuids[0], parentUuid: 'nobody'},
      {type: ComponentChangeType.CreateEntities, uuid: uuids[2], token: 'node'},
      {type: ComponentChangeType.CreateEntities, uuid: uuids[3], token: 'node'},
    ];

    it('refuses the trail with the number of entries it applied and the reason underneath', () => {
      const kernel = new Kernel(new Registry());
      const uuids: [string, string, string, string] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      let refusal: unknown;
      try {
        kernel.run({changeTrail: makeTrail(uuids)});
      } catch (error) {
        refusal = error;
      }

      expect(refusal).toBeInstanceOf(ChangeTrailRefusedError);

      const refused = refusal as ChangeTrailRefusedError;
      expect(refused.appliedCount).toBe(2);
      expect(refused.entryCount).toBe(5);
      expect(refused.cause, 'what the entry threw is kept, not replaced').toBeInstanceOf(Error);
      expect(`${refused.cause}`).toMatch(/not found/);

      kernel.destroy();
    });

    // The count is only worth anything because the kernel holds a prefix of the trail: the loop
    // ends at the entry that threw, so everything behind it was never attempted.
    it('holds the entries ahead of the one that threw and none of the ones behind it', () => {
      const kernel = new Kernel(new Registry());
      const uuids: [string, string, string, string] = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];

      expect(() => kernel.run({changeTrail: makeTrail(uuids)})).toThrow();

      expect(kernel.hasEntity(uuids[0])).toBe(true);
      expect(kernel.hasEntity(uuids[1])).toBe(true);
      expect(kernel.getEntity(uuids[0]).parentUuid, 'the entry that threw changed nothing').toBeUndefined();
      expect(kernel.hasEntity(uuids[2])).toBe(false);
      expect(kernel.hasEntity(uuids[3])).toBe(false);

      kernel.destroy();
    });

    // An effect the batch defers belongs to no single entry: every entry of the trail returned
    // normally, and the throw happens once the batch releases what they set in motion.
    it('counts the whole trail as applied when a deferred effect throws after the last entry', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const testSignal = createSignal(0);
      const boom = new Error('the deferred effect refuses');

      @ShadowObject({registry, token: 'deferredThrow'})
      class DeferredThrow implements OnCreate {
        constructor({createEffect: createScopeEffect}: ShadowObjectCreationAPI) {
          createScopeEffect(() => {
            if (testSignal.get() > 0) throw boom;
          });
        }

        [onCreate]() {
          testSignal.set(1);
        }
      }
      expect(DeferredThrow).toBeDefined();

      const uuid = generateUUID();

      let refusal: unknown;
      try {
        kernel.run({changeTrail: [{type: ComponentChangeType.CreateEntities, uuid, token: 'deferredThrow'}]});
      } catch (error) {
        refusal = error;
      }

      expect(refusal).toBeInstanceOf(ChangeTrailRefusedError);

      const refused = refusal as ChangeTrailRefusedError;
      expect(refused.appliedCount).toBe(1);
      expect(refused.entryCount).toBe(1);
      expect(kernel.hasEntity(uuid), 'the entry itself went through').toBe(true);

      destroySignal(testSignal);
      kernel.destroy();
    });
  });

  describe('the parent-change notification inside a change trail', () => {
    it('reaches its listener before the next entry of the trail is applied', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, pUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(pUuid, 'p');

      // `delivered` is the discriminator: a delivery still sitting in a queued microtask has not
      // reached the listener by the time `run()` returns, so this stays `0` on the old path and
      // only tells the two paths apart once the notification itself has actually gone out.
      let delivered = 0;
      let propAtDelivery: unknown;
      on(kernel.getEntity(aUuid), onParentChanged, () => {
        delivered += 1;
        propAtDelivery = kernel.getEntity(aUuid).getProperty('x');
      });

      kernel.run({
        changeTrail: [
          {type: ComponentChangeType.SetParent, uuid: aUuid, parentUuid: pUuid, order: 0},
          {type: ComponentChangeType.ChangeProperties, uuid: aUuid, properties: [['x', 1]]},
        ],
      });

      expect(delivered, 'the notification has already reached its listener once run() returns').toBe(1);
      expect(propAtDelivery).toBeUndefined();
      expect(kernel.getEntity(aUuid).getProperty('x')).toBe(1);

      kernel.destroy();
    });

    it('does not refuse the trail when a handler throws', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, pUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(pUuid, 'p');

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      on(kernel.getEntity(aUuid), onParentChanged, () => {
        throw new Error('handler fails');
      });

      expect(() =>
        kernel.run({
          changeTrail: [{type: ComponentChangeType.SetParent, uuid: aUuid, parentUuid: pUuid, order: 0}],
        }),
      ).not.toThrow();

      consoleError.mockRestore();
      kernel.destroy();
    });
  });
});
