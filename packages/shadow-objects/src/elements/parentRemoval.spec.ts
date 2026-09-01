import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import '../shae-ent.js';
import {stopWatchingForRemovalFrom, watchForRemovalFrom} from './parentRemoval.js';

/** happy-dom delivers a `MutationObserver` callback on a microtask; a macrotask outlasts it too. */
const waitForObserverCallback = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const OriginalMutationObserver = globalThis.MutationObserver;

describe('parentRemoval', () => {
  let observerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // happy-dom's `MutationObserver` only accepts construction that stays bound to its own window
    // context, which a plain `vi.spyOn` breaks — so the mock counts the calls and delegates the
    // actual construction to the original class. An arrow function cannot stand in here: `vi`
    // requires the mock to be `new`-able, which only a `function` expression is.
    // biome-ignore lint/complexity/useArrowFunction: must stay `new`-able, see comment above
    observerSpy = vi.spyOn(globalThis, 'MutationObserver').mockImplementation(function (callback: MutationCallback) {
      return new OriginalMutationObserver(callback);
    });
  });

  afterEach(() => {
    observerSpy.mockRestore();
    document.body.replaceChildren();
  });

  it('runs the callback of the node taken out of the parent, and not that of a watched sibling', async () => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    const sibling = document.createElement('div');
    parent.append(node, sibling);
    document.body.append(parent);

    const onRemoved = vi.fn();
    const onSiblingRemoved = vi.fn();
    watchForRemovalFrom(parent, node, onRemoved);
    watchForRemovalFrom(parent, sibling, onSiblingRemoved);

    node.remove();
    await waitForObserverCallback();

    expect(onRemoved).toHaveBeenCalledTimes(1);
    expect(onSiblingRemoved).not.toHaveBeenCalled();
  });

  it('does not run a callback for a pair that unsubscribed', async () => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    parent.append(node);
    document.body.append(parent);

    const onRemoved = vi.fn();
    watchForRemovalFrom(parent, node, onRemoved);
    stopWatchingForRemovalFrom(parent, node);

    node.remove();
    await waitForObserverCallback();

    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('carries every node watched on one parent with a single observer', () => {
    const parent = document.createElement('div');
    const nodes = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
    parent.append(...nodes);
    document.body.append(parent);

    for (const node of nodes) watchForRemovalFrom(parent, node, () => undefined);

    expect(observerSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects the observer once its last watcher is gone', () => {
    const parent = document.createElement('div');
    const nodes = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
    const fourth = document.createElement('div');
    parent.append(...nodes, fourth);
    document.body.append(parent);

    for (const node of nodes) watchForRemovalFrom(parent, node, () => undefined);
    for (const node of nodes) stopWatchingForRemovalFrom(parent, node);

    watchForRemovalFrom(parent, fourth, () => undefined);

    // the registry dropped the first watch along with its observer, so a fourth watcher on the
    // same parent had to build a new one — a second call the shared registry could have skipped
    expect(observerSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps the observation standing for a callback that re-registers its node under the same parent', async () => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    parent.append(node);
    document.body.append(parent);

    const onRemoved = vi.fn(() => {
      // the moveBefore case within the same parent, reproduced at the unit level: the callback
      // decides right away that its node goes on being watched
      parent.append(node);
      watchForRemovalFrom(parent, node, onRemoved);
    });
    watchForRemovalFrom(parent, node, onRemoved);

    node.remove();
    await waitForObserverCallback();
    expect(onRemoved).toHaveBeenCalledTimes(1);
    expect(observerSpy).toHaveBeenCalledTimes(1);

    node.remove();
    await waitForObserverCallback();
    expect(onRemoved).toHaveBeenCalledTimes(2);
    expect(observerSpy).toHaveBeenCalledTimes(1);
  });

  it('does not run the callback of a node unwatched and re-registered under the same parent within the same task, but does run a sibling removed alongside it', async () => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    const sibling = document.createElement('div');
    parent.append(node, sibling);
    document.body.append(parent);

    const onRemoved = vi.fn();
    const onSiblingRemoved = vi.fn();
    watchForRemovalFrom(parent, node, onRemoved);
    watchForRemovalFrom(parent, sibling, onSiblingRemoved);

    // a sibling stays watched, so the shared observer keeps standing instead of being torn down
    // and rebuilt — which is exactly what leaves its still-pending removal record in play
    node.remove();
    stopWatchingForRemovalFrom(parent, node);
    sibling.remove();

    // still inside the same task: the observer has not delivered this batch yet. Re-registering
    // `node` here has to take that pending record off the table itself, not wait for it
    parent.append(node);
    watchForRemovalFrom(parent, node, onRemoved);

    await waitForObserverCallback();

    expect(onRemoved).not.toHaveBeenCalled();
    expect(onSiblingRemoved).toHaveBeenCalledTimes(1);
  });

  it('runs the callbacks of the other nodes in the same batch when one callback throws', async () => {
    const parent = document.createElement('div');
    const node = document.createElement('div');
    const sibling = document.createElement('div');
    parent.append(node, sibling);
    document.body.append(parent);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onSiblingRemoved = vi.fn();
    watchForRemovalFrom(parent, node, () => {
      throw new Error('a removal watcher throws');
    });
    watchForRemovalFrom(parent, sibling, onSiblingRemoved);

    parent.replaceChildren();
    await waitForObserverCallback();

    expect(onSiblingRemoved).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it('leaves a node watched when a callback from the same dispatch unwatches the last other watcher of the same parent', async () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const c = document.createElement('div');
    parent.append(a, b, c);
    document.body.append(parent);

    const onB = vi.fn();
    const onC = vi.fn();
    watchForRemovalFrom(parent, a, () => {
      // torn down from inside the very dispatch that is about to register `c` on the same parent
      stopWatchingForRemovalFrom(parent, b);
    });
    watchForRemovalFrom(parent, b, onB);

    a.remove();
    // still inside the same task: the pending record for `a` has not been delivered yet, and the
    // registration below drains it — which is what runs the callback above synchronously and
    // tears the shared watch down before `c` is added to it
    watchForRemovalFrom(parent, c, onC);

    c.remove();
    await waitForObserverCallback();

    expect(onB).not.toHaveBeenCalled();
    expect(onC).toHaveBeenCalledTimes(1);
  });

  it('adds a node to the watch a callback from the same dispatch replaced, instead of building a competing one', async () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const e = document.createElement('div');
    const d = document.createElement('div');
    parent.append(a, b, e, d);
    document.body.append(parent);

    const onE = vi.fn();
    const onD = vi.fn();
    watchForRemovalFrom(parent, a, () => {
      // the last other watcher on this parent's watch goes too, and a fresh watch for the same
      // parent is built before the dispatch that triggered all this gets to look again
      stopWatchingForRemovalFrom(parent, b);
      watchForRemovalFrom(parent, e, onE);
    });
    watchForRemovalFrom(parent, b, () => undefined);

    a.remove();
    // still inside the same task: draining the pending record for `a` is what runs the callback
    // above, and the watch it swaps in is the one this call has to find
    watchForRemovalFrom(parent, d, onD);

    expect(observerSpy).toHaveBeenCalledTimes(2);

    e.remove();
    d.remove();
    await waitForObserverCallback();

    expect(onE).toHaveBeenCalledTimes(1);
    expect(onD).toHaveBeenCalledTimes(1);
  });

  it('keeps a watch a callback swapped in standing when its own observer disconnects behind it', async () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const e = document.createElement('div');
    const f = document.createElement('div');
    parent.append(a, b, e, f);
    document.body.append(parent);

    const onE = vi.fn();
    const onF = vi.fn();
    watchForRemovalFrom(parent, a, () => {
      // the last other watcher on this same observer goes too, from inside its own real
      // delivery — and a fresh watch for the same parent is built before that delivery gets
      // to check whether it still owns the registry entry
      stopWatchingForRemovalFrom(parent, b);
      watchForRemovalFrom(parent, e, onE);
    });
    watchForRemovalFrom(parent, b, () => undefined);

    a.remove();
    await waitForObserverCallback(); // the real async delivery this time, not a drain via takeRecords

    expect(observerSpy).toHaveBeenCalledTimes(2);

    // a watch this call still finds in the registry is reused rather than replaced
    watchForRemovalFrom(parent, f, onF);
    expect(observerSpy).toHaveBeenCalledTimes(2);

    e.remove();
    f.remove();
    await waitForObserverCallback();

    expect(onE).toHaveBeenCalledTimes(1);
    expect(onF).toHaveBeenCalledTimes(1);
  });

  it('watches three <shae-ent> under one parent with a single observer', async () => {
    const parent = document.createElement('div');
    parent.append(document.createElement('shae-ent'), document.createElement('shae-ent'), document.createElement('shae-ent'));
    document.body.append(parent);

    await waitForObserverCallback();

    expect(observerSpy).toHaveBeenCalledTimes(1);
  });
});
