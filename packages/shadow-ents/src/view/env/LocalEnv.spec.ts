import {type EventizeApi} from '@spearwolf/eventize';
import {afterAll, describe, expect, it, vi} from 'vitest';
import {ComponentChangeType} from '../../constants.js';
import {Entity} from '../../entities/Entity.js';
import {Registry} from '../../entities/Registry.js';
import {ShadowObject} from '../../entities/ShadowObject.js';
import {onCreate, onRemoveFromParent, type OnCreate, type OnRemoveFromParent} from '../../entities/events.js';
import type {SyncEvent} from '../../types.js';
import {ComponentContext} from '../ComponentContext.js';
import {ViewComponent} from '../ViewComponent.js';
import {BaseEnv} from './BaseEnv.js';
import {LocalEnv} from './LocalEnv.js';

const nextSyncEvent = (env: BaseEnv): Promise<SyncEvent> =>
  new Promise((resolve) => {
    env.once(BaseEnv.OnSync, resolve);
  });

const waitForNext = (obj: EventizeApi, event: string | symbol): Promise<unknown[]> =>
  new Promise((resolve) => {
    obj.once(event, (...args: unknown[]) => resolve(args));
  });

describe('LocalEnv', () => {
  afterAll(() => {
    ComponentContext.get().clear();
    Registry.get().clear();
  });

  it('should be defined', () => {
    expect(LocalEnv).toBeDefined();
  });

  it('should start', async () => {
    const localEnv = new LocalEnv();

    expect(localEnv.isReady).toBe(false);

    localEnv.start();

    expect(localEnv.isReady).toBe(true);

    await expect(localEnv.ready).resolves.toBe(localEnv);
  });

  it('should sync', async () => {
    const localEnv = new LocalEnv().start();

    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    localEnv.sync();

    const event = await nextSyncEvent(localEnv);

    expect(event.changeTrail).toEqual([
      {type: ComponentChangeType.CreateEntities, token: 'a', uuid: a.uuid, properties: [['foo', 'bar']]},
      {type: ComponentChangeType.CreateEntities, token: 'b', uuid: b.uuid, parentUuid: a.uuid, properties: [['xyz', 123]]},
    ]);
  });

  it('should create entities and shadow-objects', async () => {
    const localEnv = new LocalEnv().start();

    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    await localEnv.sync();

    const aa = localEnv.kernel.getEntity(a.uuid);
    const bb = localEnv.kernel.getEntity(b.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');
    expect(aa.children).toHaveLength(1);

    expect(bb).toBeDefined();
    expect(bb.parent).toBe(aa);
    expect(aa.children[0]).toBe(bb);
    expect(bb.getProperty('xyz')).toBe(123);
    expect(bb.children).toHaveLength(0);

    const removeFromParentMock = vi.fn();

    @ShadowObject({token: 'c'})
    class Ccc implements OnRemoveFromParent {
      [onRemoveFromParent](_entity: Entity) {
        removeFromParentMock(this);
      }
    }

    const c = new ViewComponent('c', {parent: a, order: -1});

    await localEnv.sync();

    const cc = localEnv.kernel.getEntity(c.uuid);

    expect(aa.children).toHaveLength(2);
    expect(aa.children[0]).toBe(cc);
    expect(aa.children[1]).toBe(bb);

    expect(removeFromParentMock).not.toHaveBeenCalled();

    const resultUuid = waitForNext(cc, onRemoveFromParent).then(([entity]) => (entity as Entity).uuid);

    c.removeFromParent();

    await localEnv.sync();

    expect(aa.children).toHaveLength(1);
    expect(cc.parent).toBeUndefined();

    expect(removeFromParentMock).toHaveBeenCalled();
    expect(removeFromParentMock.mock.calls[0][0]).toBeInstanceOf(Ccc);

    await expect(resultUuid).resolves.toBe(cc.uuid);
  });

  it('should call create and init events on shadow-objects', async () => {
    const localEnv = new LocalEnv().start();

    const onCreateMock = vi.fn();

    @ShadowObject({token: 'a'})
    class Aaa implements OnCreate {
      [onCreate](entity: Entity) {
        onCreateMock(entity, this);
      }
    }

    const a = new ViewComponent('a');
    a.setProperty('foo', 'bar');

    await localEnv.sync();

    const aa = localEnv.kernel.getEntity(a.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');

    expect(onCreateMock).toBeCalled();
    expect(onCreateMock.mock.calls[0][0]).toBe(aa);
    expect(onCreateMock.mock.calls[0][1]).toBeInstanceOf(Aaa);
  });
});
