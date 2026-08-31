import {afterEach, beforeAll, describe, expect, it} from 'vitest';

import {ShaeLifecycleElement} from './ShaeLifecycleElement.js';

const PROBE_TAG = 'lifecycle-probe-element';
const REENTRANT_TAG = 'reentrant-lifecycle-probe-element';

/** Counts the two halves of the pair, so a case can read how often each of them ran. */
class LifecycleProbe extends ShaeLifecycleElement {
  restoreCount = 0;
  teardownCount = 0;

  protected override restore(): void {
    this.restoreCount += 1;
    super.restore();
  }

  protected override teardown(): void {
    this.teardownCount += 1;
    super.teardown();
  }
}

class ReentrantProbe extends ShaeLifecycleElement {
  teardownCount = 0;
  #callsBack = true;

  protected override teardown(): void {
    this.teardownCount += 1;
    // the shape the guard is for: releasing something reaches back into the element. Only the
    // first pass calls back, so a guard that fell too late shows up as a second run instead of
    // an unbounded one
    if (this.#callsBack) {
      this.#callsBack = false;
      this.destroy();
    }
    super.teardown();
  }
}

describe('ShaeLifecycleElement', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  beforeAll(() => {
    customElements.define(PROBE_TAG, LifecycleProbe);
    customElements.define(REENTRANT_TAG, ReentrantProbe);
  });

  it('a freshly built element is listening to nothing and has been torn down by nobody', () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;

    expect(el.restoreCount).toBe(0);
    expect(el.teardownCount).toBe(0);
    expect(el.isDestroyed).toBe(false);
  });

  it('takes its subscriptions up at the first connect', () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    document.body.append(el);

    expect(el.restoreCount).toBe(1);
    expect(el.teardownCount).toBe(0);
    expect(el.isDestroyed).toBe(false);
  });

  it('stays subscribed across a move within one task', async () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    const nextParent = document.createElement('div');
    document.body.append(el, nextParent);

    // appending to the second parent takes the element out of the first one
    nextParent.append(el);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(el.restoreCount).toBe(1);
    expect(el.teardownCount).toBe(0);
    expect(el.isDestroyed).toBe(false);
  });

  it('tears down one microtask after it stays out', async () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    document.body.append(el);

    el.remove();
    await Promise.resolve();

    expect(el.teardownCount).toBe(1);
    expect(el.isDestroyed).toBe(true);
  });

  it('takes the same subscriptions up again on the way back', async () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    document.body.append(el);

    el.remove();
    await Promise.resolve();
    document.body.append(el);

    expect(el.restoreCount).toBe(2);
    expect(el.isDestroyed).toBe(false);
  });

  it('counts one teardown however often destroy is called', () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    document.body.append(el);

    el.destroy();
    el.destroy();

    expect(el.teardownCount).toBe(1);
    expect(el.isDestroyed).toBe(true);
  });

  it('runs the teardown once when releasing something reaches back into destroy', () => {
    const el = document.createElement(REENTRANT_TAG) as ReentrantProbe;
    document.body.append(el);

    el.destroy();

    expect(el.teardownCount).toBe(1);
    expect(el.isDestroyed).toBe(true);
  });

  it('carries the display rule for its own tag into the root it connects in', () => {
    const el = document.createElement(PROBE_TAG) as LifecycleProbe;
    document.body.append(el);

    const rules = Array.from(document.head.querySelectorAll('style'), (style) => style.textContent ?? '');

    // the tags of one root grow together into a single selector list, and one tag name can be a
    // substring of another — so the assertion has to meet a whole selector token, not a substring
    const selectors = rules.flatMap((rule) => (rule.split('{')[0] ?? '').split(','));

    expect(selectors).toContain(PROBE_TAG);
  });
});
