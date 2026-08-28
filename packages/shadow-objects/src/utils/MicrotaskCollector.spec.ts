import {describe, expect, it} from 'vitest';
import {MicrotaskCollector} from './MicrotaskCollector.js';

/** Resolves once every microtask queued before it has run. */
const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('MicrotaskCollector', () => {
  it('hands everything written in one task over in one batch', async () => {
    const deliveries: Map<string, number>[] = [];
    const collector = new MicrotaskCollector<string, number>((entries) => {
      deliveries.push(entries);
    });

    collector.add('a', 1);
    collector.add('b', 2);

    expect(deliveries).toHaveLength(0);

    await nextMicrotask();

    expect(deliveries).toHaveLength(1);
    expect([...deliveries[0]!]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('keeps one entry per key, on the value written last', async () => {
    const deliveries: Map<string, number>[] = [];
    const collector = new MicrotaskCollector<string, number>((entries) => {
      deliveries.push(entries);
    });

    collector.add('a', 1);
    collector.add('a', 2);

    await nextMicrotask();

    expect(deliveries).toHaveLength(1);
    expect([...deliveries[0]!]).toEqual([['a', 2]]);
  });

  it('puts a write made from inside a delivery into the round behind it', async () => {
    const deliveries: string[][] = [];
    let collector!: MicrotaskCollector<string, undefined>;

    collector = new MicrotaskCollector<string>((entries) => {
      deliveries.push([...entries.keys()]);
      if (deliveries.length === 1) {
        collector.add('written-by-the-delivery');
      }
    });

    collector.add('a');

    await nextMicrotask();
    await nextMicrotask();

    expect(deliveries).toEqual([['a'], ['written-by-the-delivery']]);
  });

  it('leaves no entry standing when a delivery throws', async () => {
    const deliveries: string[][] = [];
    const collector = new MicrotaskCollector<string>((entries) => {
      deliveries.push([...entries.keys()]);
      if (deliveries.length === 1) {
        throw new Error('the delivery failed');
      }
    });

    collector.add('a');

    // through `flush()` rather than through the queued microtask: it is the same body, and an
    // error thrown out of a microtask has no caller to reach in a test
    expect(() => collector.flush()).toThrow('the delivery failed');

    collector.add('b');

    await nextMicrotask();

    expect(deliveries).toEqual([['a'], ['b']]);
  });

  it('delivers on a flush by hand, and the queued microtask does not deliver again', async () => {
    const deliveries: string[][] = [];
    const collector = new MicrotaskCollector<string>((entries) => {
      deliveries.push([...entries.keys()]);
    });

    collector.add('a');
    collector.flush();

    expect(deliveries).toEqual([['a']]);

    await nextMicrotask();

    expect(deliveries).toEqual([['a']]);
  });

  it('does not call the delivery when there is nothing to hand over', () => {
    let deliveries = 0;
    const collector = new MicrotaskCollector<string>(() => {
      deliveries += 1;
    });

    collector.flush();

    expect(deliveries).toBe(0);
  });
});
