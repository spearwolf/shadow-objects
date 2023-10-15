import {type EventizeApi} from '@spearwolf/eventize';
import {afterAll, describe, expect, it, vi} from 'vitest';
import {ComponentChangeType} from '../../constants.js';
import {Entity} from '../../entities/Entity.js';
import {Registry} from '../../entities/Registry.js';
import {Uplink} from '../../entities/Uplink.js';
import {OnCreate, OnInit, OnRemoveFromParent} from '../../entities/events.js';
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

  it('should create uplinks and entities', async () => {
    const localEnv = new LocalEnv().start();

    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    await localEnv.sync();

    const aa = localEnv.kernel.getUplink(a.uuid);
    const bb = localEnv.kernel.getUplink(b.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');
    expect(aa.children).toHaveLength(1);

    expect(bb).toBeDefined();
    expect(bb.parent).toBe(aa);
    expect(aa.children[0]).toBe(bb);
    expect(bb.getProperty('xyz')).toBe(123);
    expect(bb.children).toHaveLength(0);

    const onRemoveFromParent = vi.fn();

    @Entity({token: 'c'})
    class EntityCcc implements OnRemoveFromParent {
      [OnRemoveFromParent](_uplink: Uplink) {
        onRemoveFromParent(this);
      }
    }

    const c = new ViewComponent('c', a, -1);

    await localEnv.sync();

    const cc = localEnv.kernel.getUplink(c.uuid);

    expect(aa.children).toHaveLength(2);
    expect(aa.children[0]).toBe(cc);
    expect(aa.children[1]).toBe(bb);

    expect(onRemoveFromParent).not.toHaveBeenCalled();

    const removeFromParent = waitForNext(cc, OnRemoveFromParent).then(([entity]) => (entity as Uplink).uuid);

    c.removeFromParent();

    await localEnv.sync();

    expect(aa.children).toHaveLength(1);
    expect(cc.parent).toBeUndefined();

    expect(onRemoveFromParent).toHaveBeenCalled();
    expect(onRemoveFromParent.mock.calls[0][0]).toBeInstanceOf(EntityCcc);

    await expect(removeFromParent).resolves.toBe(cc.uuid);
  });

  it('should call create and init events on entities', async () => {
    const localEnv = new LocalEnv().start();

    const onCreateMock = vi.fn();
    const onInitMock = vi.fn();

    @Entity({token: 'a'})
    class Aaa implements OnCreate, OnInit {
      [OnCreate](uplink: Uplink) {
        onCreateMock(uplink, this);
      }
      [OnInit](uplink: Uplink) {
        onInitMock(uplink, this);
      }
    }

    const a = new ViewComponent('a');
    a.setProperty('foo', 'bar');

    await localEnv.sync();

    const aa = localEnv.kernel.getUplink(a.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');

    expect(Aaa).toBeDefined();

    expect(onCreateMock).toBeCalled();
    expect(onCreateMock.mock.calls[0][0]).toBe(aa);
    expect(onCreateMock.mock.calls[0][1]).toBeInstanceOf(Aaa);

    expect(onInitMock).toBeCalled();
    expect(onInitMock.mock.calls[0][0]).toBe(aa);
    expect(onInitMock.mock.calls[0][1]).toBeInstanceOf(Aaa);
  });
});
