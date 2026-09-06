import {afterEach, describe, expect, it, vi} from 'vitest';
import {settle} from './settle.js';

describe('settle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drains a cascade of microtasks, not just the first generation', async () => {
    const order: string[] = [];

    queueMicrotask(() => {
      order.push('first');
      queueMicrotask(() => {
        order.push('second');
        queueMicrotask(() => {
          order.push('third');
        });
      });
    });

    expect(order).toEqual([]);

    await settle();

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('resolves while fake timers are installed', async () => {
    vi.useFakeTimers();

    let reached = false;
    queueMicrotask(() => {
      reached = true;
    });

    await settle();

    expect(reached).toBe(true);
  });
});
