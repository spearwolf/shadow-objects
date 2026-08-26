import {describe, expect, it} from 'vitest';
import {ComponentChangeType, VoidToken} from '../constants.js';
import type {ComponentPropertiesType, IComponentChange} from '../types.js';
import {ComponentMemory} from './ComponentMemory.js';

const UUID = 'c-1';

const createEntity = (overrides: Record<string, unknown> = {}): IComponentChange =>
  ({type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a', ...overrides}) as IComponentChange;

describe('ComponentMemory', () => {
  describe('an empty memory', () => {
    it('reports itself as empty', () => {
      expect(new ComponentMemory().isEmpty()).toBe(true);
    });

    it('knows nothing about any component', () => {
      const memory = new ComponentMemory();

      expect(memory.hasComponentState(UUID)).toBe(false);
      expect(memory.getComponentState(UUID)).toBeUndefined();
    });

    it('ignores changes for components it does not know', () => {
      const memory = new ComponentMemory();

      memory.write([
        {type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'b'} as IComponentChange,
        {type: ComponentChangeType.UpdateOrder, uuid: UUID, order: 5} as IComponentChange,
        {type: ComponentChangeType.DestroyEntities, uuid: UUID} as IComponentChange,
      ]);

      expect(memory.isEmpty()).toBe(true);
    });
  });

  describe('create-entities', () => {
    it('stores the component state', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity({parentUuid: 'p-1', order: 3})]);

      expect(memory.hasComponentState(UUID)).toBe(true);
      expect(memory.getComponentState(UUID)).toEqual({
        token: 'a',
        parentUuid: 'p-1',
        order: 3,
        properties: undefined,
      });
    });

    it('defaults the order to 0', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity()]);

      expect(memory.getComponentState(UUID)!.order).toBe(0);
    });

    it('falls back to the void token for an empty token', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity({token: ''})]);

      expect(memory.getComponentState(UUID)!.token).toBe(VoidToken);
    });

    it('stores properties and drops undefined values', () => {
      const memory = new ComponentMemory();
      memory.write([
        createEntity({
          properties: [
            ['foo', 'bar'],
            ['gone', undefined],
          ],
        }),
      ]);

      expect(memory.getComponentState(UUID)!.properties).toEqual([['foo', 'bar']]);
    });

    it('keeps autoDestructionOnParentRemoval only when it is set', () => {
      const withFlag = new ComponentMemory();
      withFlag.write([createEntity({autoDestructionOnParentRemoval: true})]);
      expect(withFlag.getComponentState(UUID)).toHaveProperty('autoDestructionOnParentRemoval', true);

      const withoutFlag = new ComponentMemory();
      withoutFlag.write([createEntity()]);
      expect(withoutFlag.getComponentState(UUID)).not.toHaveProperty('autoDestructionOnParentRemoval');
    });

    it('replaces the state when the same uuid is created again', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity({order: 3, properties: [['foo', 'bar']]})]);
      memory.write([createEntity({token: 'b'})]);

      expect(memory.getComponentState(UUID)).toEqual({token: 'b', parentUuid: undefined, order: 0, properties: undefined});
    });
  });

  describe('follow-up changes', () => {
    const withComponent = (overrides: Record<string, unknown> = {}) => {
      const memory = new ComponentMemory();
      memory.write([createEntity(overrides)]);
      return memory;
    };

    it('applies a token change', () => {
      const memory = withComponent();
      memory.write([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'b'} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.token).toBe('b');
    });

    it('falls back to the void token for an empty token change', () => {
      const memory = withComponent();
      memory.write([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: ''} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.token).toBe(VoidToken);
    });

    it('applies an order update', () => {
      const memory = withComponent();
      memory.write([{type: ComponentChangeType.UpdateOrder, uuid: UUID, order: 9} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.order).toBe(9);
    });

    it('applies a parent change', () => {
      const memory = withComponent();
      memory.write([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'p-2'} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.parentUuid).toBe('p-2');
    });

    it('applies a parent change together with a new order', () => {
      const memory = withComponent({order: 3});
      memory.write([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'p-2', order: 8} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.order).toBe(8);
    });

    it('keeps the order when a parent change carries none', () => {
      const memory = withComponent({order: 3});
      memory.write([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'p-2'} as IComponentChange]);

      expect(memory.getComponentState(UUID)!.order).toBe(3);
    });

    it('merges property changes', () => {
      const memory = withComponent({properties: [['foo', 'bar']]});
      memory.write([
        {
          type: ComponentChangeType.ChangeProperties,
          uuid: UUID,
          properties: [
            ['foo', 'baz'],
            ['num', 42],
          ],
        } as IComponentChange,
      ]);

      expect(memory.getComponentState(UUID)!.properties).toEqual([
        ['foo', 'baz'],
        ['num', 42],
      ]);
    });

    it('leaves a change it has already written untouched', () => {
      const properties: ComponentPropertiesType = [['foo', 'bar']];
      const memory = withComponent({properties});

      memory.write([{type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['foo', 'baz']]} as IComponentChange]);

      expect(properties).toEqual([['foo', 'bar']]);
      expect(memory.getComponentState(UUID)!.properties).toEqual([['foo', 'baz']]);
    });

    it('removes a property that is changed to undefined', () => {
      const memory = withComponent({
        properties: [
          ['foo', 'bar'],
          ['num', 42],
        ],
      });
      memory.write([
        {type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['foo', undefined]]} as IComponentChange,
      ]);

      expect(memory.getComponentState(UUID)!.properties).toEqual([['num', 42]]);
    });

    it('forgets a destroyed component', () => {
      const memory = withComponent();
      memory.write([{type: ComponentChangeType.DestroyEntities, uuid: UUID} as IComponentChange]);

      expect(memory.hasComponentState(UUID)).toBe(false);
      expect(memory.isEmpty()).toBe(true);
    });
  });

  describe('iteration and clearing', () => {
    it('iterates over uuid and state pairs', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity(), createEntity({uuid: 'c-2', token: 'b'})]);

      expect([...memory].map(([uuid, state]) => [uuid, state.token])).toEqual([
        [UUID, 'a'],
        ['c-2', 'b'],
      ]);
    });

    it('is empty again after clear()', () => {
      const memory = new ComponentMemory();
      memory.write([createEntity()]);

      memory.clear();

      expect(memory.isEmpty()).toBe(true);
    });
  });
});
