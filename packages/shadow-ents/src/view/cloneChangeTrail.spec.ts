import {describe, expect, it} from 'vitest';
import {ComponentChangeType} from '../constants.js';
import type {ChangeTrailType, ICreateEntitiesChange, ISendEvents} from '../types.js';
import {cloneChangeTrail} from './cloneChangeTrail.js';

describe('cloneChangeTrail', () => {
  it('empty data', () => {
    const data: ChangeTrailType = [];

    const dolly = cloneChangeTrail(data);

    expect(dolly).toBeDefined();
    expect(Array.isArray(dolly)).toBeTruthy();
    expect(dolly).not.toBe(data);
  });

  it('data without transferables', () => {
    const data: ChangeTrailType = [
      {
        type: ComponentChangeType.CreateEntities,
        uuid: 'id0',
        token: 'test',
        properties: [['foo', 'bar']],
      },
    ];

    const dolly = cloneChangeTrail(data);

    expect(dolly).toBeDefined();
    expect(dolly).not.toBe(data);
    expect(dolly[0]).not.toBe(data[0]);
    expect(dolly[0]).toEqual(data[0]);
  });

  it('data with transferables', () => {
    const bar = {bar: 666};
    const plah = {plah: 777};

    const data: ChangeTrailType = [
      {
        type: ComponentChangeType.CreateEntities,
        uuid: 'id0',
        token: 'test',
        properties: [['foo', bar]],
        transferables: [bar],
      },
      {
        type: ComponentChangeType.SendEvents,
        uuid: 'id1',
        events: [
          {
            type: 'test',
            data: plah,
          },
        ],
        transferables: [plah],
      },
    ];

    const dolly = cloneChangeTrail(data);

    expect(dolly[0]).not.toBe(data[0]);
    expect(dolly[0].uuid).toEqual(data[0].uuid);
    expect((dolly[0] as ICreateEntitiesChange).properties[0][1]).toBe(bar);

    expect(dolly[1]).not.toBe(data[1]);
    expect(dolly[1].uuid).toEqual(data[1].uuid);
    expect((dolly[1] as ISendEvents).events[0].data).toBe(plah);
  });
});
