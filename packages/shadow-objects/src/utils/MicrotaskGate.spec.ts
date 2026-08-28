import {describe, expect, it} from 'vitest';
import {MicrotaskGate} from './MicrotaskGate.js';

/** Resolves once every microtask queued before it has run. */
const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('MicrotaskGate', () => {
  it('runs the action once however often it is asked for in one task', async () => {
    let runs = 0;
    const gate = new MicrotaskGate(() => {
      runs += 1;
    });

    gate.schedule();
    gate.schedule();
    gate.schedule();

    expect(runs).toBe(0);

    await nextMicrotask();

    expect(runs).toBe(1);
  });

  it('books a fresh round for an action that asks again from inside itself', async () => {
    let runs = 0;
    let gate!: MicrotaskGate;

    gate = new MicrotaskGate(() => {
      runs += 1;
      if (runs === 1) {
        gate.schedule();
      }
    });

    gate.schedule();

    expect(runs).toBe(0);

    // the second booking is a round of its own -- the action had already returned when it ran, and
    // the microtask queue drains both rounds in the same turn
    await nextMicrotask();
    expect(runs).toBe(2);

    await nextMicrotask();
    expect(runs).toBe(2);
  });
});
