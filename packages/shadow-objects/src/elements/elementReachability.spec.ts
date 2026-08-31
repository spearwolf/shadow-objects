import {createEffect, createSignal} from '@spearwolf/signalize';
import {afterEach, beforeAll, describe, expect, it} from 'vitest';

import '../shae-ent.js';
import '../shae-prop.js';
import '../shae-worker.js';
import type {ShadowEnv} from '../view/ShadowEnv.js';
import {
  ATTR_FORWARD_CUSTOM_EVENTS,
  ATTR_NO_AUTOSTART,
  ATTR_NS,
  ATTR_TOKEN,
  ATTR_VALUE,
  ReRequestEntHostEventName,
  SHAE_ENT,
  SHAE_PROP,
  SHAE_WORKER,
} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';
import type {ShaePropElement} from './ShaePropElement.js';
import type {ShaeWorkerElement} from './ShaeWorkerElement.js';

/** A custom element with nothing of this library in it — the yardstick every other case is read against. */
const PLAIN_TAG = 'plain-control-element';

/** `--expose-gc` puts this on the global object; without the flag it is not there at all. */
const forceGc = (): (() => void) | undefined => (globalThis as {gc?: () => void}).gc;

/**
 * Force a collection and give the runtime room to actually run one.
 *
 * One call is not enough to settle the question: a first pass can clear the last strong reference
 * to an object that is only then eligible, and a task boundary in between releases whatever the
 * runtime still holds from the frames that just ran.
 */
const collect = async (): Promise<void> => {
  for (let round = 0; round < 3; round++) {
    forceGc()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/**
 * Run one element through arriving, being removed and staying removed, and hand back nothing but a
 * weak reference to it.
 *
 * The element must be unreachable from the spec body by the time the collection runs. A binding in
 * the test would hold it and every case below would pass for the wrong reason, so the element lives
 * in this function and nowhere else.
 */
const liveAndLeave = async (tagName: string, prepare?: (el: HTMLElement) => void): Promise<WeakRef<HTMLElement>> => {
  const el = document.createElement(tagName);
  prepare?.(el);
  document.body.append(el);
  el.remove();
  // one microtask: that is the window in which a removal still counts as a move
  await Promise.resolve();
  return new WeakRef(el);
};

/**
 * Build one element, leave it where it was built, and hand back nothing but a weak reference to it.
 *
 * Same rule as {@link liveAndLeave}: the element must be unreachable from the spec body by the time
 * the collection runs, so it lives in this function and nowhere else.
 */
const createAndDrop = async (tagName: string, prepare?: (el: HTMLElement) => void): Promise<WeakRef<HTMLElement>> => {
  const el = document.createElement(tagName);
  prepare?.(el);
  return new WeakRef(el);
};

/**
 * Build one `<shae-worker>`, leave it where it was built, and hand back nothing but a weak
 * reference to the shadow environment it carries.
 *
 * Same rule as {@link createAndDrop}, for both objects at once: neither the element nor its
 * environment may stay reachable from the spec body, so both live in this function and nowhere
 * else.
 */
const createWorkerAndDropItsEnv = async (): Promise<WeakRef<ShadowEnv>> => {
  const el = document.createElement(SHAE_WORKER) as ShaeWorkerElement;
  el.setAttribute(ATTR_NO_AUTOSTART, '');
  return new WeakRef(el.shadowEnv);
};

/** An element out of the tree, one microtask past its removal. */
const removeAndSettle = async (el: HTMLElement): Promise<void> => {
  el.remove();
  await Promise.resolve();
};

// No case here may rest on where it stands in this file. A collection case answers for one element,
// and it only does so while nothing else holds that element — a case further up that left something
// in the document, or in a detached node it still points at, would decide the answer for every case
// below it. Hence the `afterEach` that empties the document and the rule that each case gives up its
// own local bindings before it returns.
describe('element reachability', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  beforeAll(() => {
    customElements.define(PLAIN_TAG, class extends HTMLElement {});

    // A missing `--expose-gc` has to fail this suite instead of skipping it: a case that quietly
    // does not run says nothing about reachability, and would keep saying nothing for as long as
    // nobody looks. The flag comes from `execArgv` in `vitest.config.ts`.
    expect(typeof forceGc(), 'globalThis.gc is missing — the test process needs --expose-gc').toBe('function');
  });

  it('collects a plain custom element that leaves the document — the control case', async () => {
    const ref = await liveAndLeave(PLAIN_TAG);
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-ent> that leaves the document', async () => {
    const ref = await liveAndLeave(SHAE_ENT);
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-prop> that leaves the document', async () => {
    const ref = await liveAndLeave(SHAE_PROP, (el) => el.setAttribute('name', 'foo'));
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-worker> that leaves the document', async () => {
    // no autostart: building a worker environment is a different subject, and this environment
    // has no worker to build one with
    const ref = await liveAndLeave(SHAE_WORKER, (el) => el.setAttribute(ATTR_NO_AUTOSTART, ''));
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a plain custom element that is created and never connected — the control case', async () => {
    const ref = await createAndDrop(PLAIN_TAG);
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-ent> that is created and never connected', async () => {
    const ref = await createAndDrop(SHAE_ENT);
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-prop> that is created and never connected', async () => {
    const ref = await createAndDrop(SHAE_PROP, (el) => el.setAttribute('name', 'foo'));
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects a <shae-worker> that is created and never connected', async () => {
    const ref = await createAndDrop(SHAE_WORKER, (el) => el.setAttribute(ATTR_NO_AUTOSTART, ''));
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('collects the shadow environment of a <shae-worker> that is created and never connected', async () => {
    const ref = await createWorkerAndDropItsEnv();
    await collect();
    expect(ref.deref()).toBeUndefined();
  });

  it('writes the normalised namespace onto the attribute of a <shae-ent> as it first connects', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    ent.setAttribute(ATTR_NS, '  local  ');

    document.body.append(ent);

    expect(ent.ns, 'ns').toBe('local');
    expect(ent.getAttribute(ATTR_NS), 'ns attribute').toBe('local');
  });

  it('keeps a <shae-ent> that was appended from inside a foreign effect working when that effect runs again', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;

    // whoever appends an element decides nothing about that element's subscriptions. A signal
    // effect of the application is such a caller, and its next run releases everything that was
    // set up while it was running — the element's subscriptions must not be among them
    const rerun$ = createSignal(0);
    const foreign = createEffect(() => {
      rerun$.get();
      if (!ent.isConnected) {
        document.body.append(ent);
      }
    });

    rerun$.set(1);

    ent.token = 'after-the-rerun';

    expect(ent.token, 'token').toBe('after-the-rerun');
    expect(ent.getAttribute(ATTR_TOKEN), 'token attribute').toBe('after-the-rerun');
    expect(ent.viewComponent?.token, 'the token reached the entity').toBe('after-the-rerun');

    foreign.destroy();
  });

  it('tears an element down once it stays out of the document', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    const prop = document.createElement(SHAE_PROP) as ShaePropElement;
    const worker = document.createElement(SHAE_WORKER) as ShaeWorkerElement;
    worker.setAttribute(ATTR_NO_AUTOSTART, '');

    ent.append(prop);
    document.body.append(ent, worker);

    expect(ent.isDestroyed).toBe(false);
    expect(prop.isDestroyed).toBe(false);
    expect(worker.isDestroyed).toBe(false);

    await removeAndSettle(ent);
    await removeAndSettle(worker);

    expect(ent.isDestroyed).toBe(true);
    expect(prop.isDestroyed).toBe(true);
    expect(worker.isDestroyed).toBe(true);
  });

  it('keeps an element working across a move within one task', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    const prop = document.createElement(SHAE_PROP) as ShaePropElement;
    const worker = document.createElement(SHAE_WORKER) as ShaeWorkerElement;
    worker.setAttribute(ATTR_NO_AUTOSTART, '');
    prop.setAttribute('name', 'foo');

    const oldHome = document.createElement('div');
    const newHome = document.createElement('div');
    document.body.append(oldHome, newHome);

    oldHome.append(ent, worker);
    ent.append(prop);

    ent.remove();
    worker.remove();
    newHome.append(ent, worker);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ent.isDestroyed).toBe(false);
    expect(prop.isDestroyed).toBe(false);
    expect(worker.isDestroyed).toBe(false);

    // still reacting: each element carries an attribute write through to the value it exposes
    ent.setAttribute(ATTR_TOKEN, 'moved');
    prop.setAttribute(ATTR_VALUE, 'moved');
    worker.setAttribute('auto-sync', 'no');

    expect(ent.token).toBe('moved');
    expect(ent.viewComponent?.token).toBe('moved');
    expect(prop.value).toBe('moved');
    expect(worker.autoSync).toBe('no');
  });

  it('takes <shae-ent> and <shae-prop> back after a teardown, while <shae-worker> stays down', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    const prop = document.createElement(SHAE_PROP) as ShaePropElement;
    const worker = document.createElement(SHAE_WORKER) as ShaeWorkerElement;
    worker.setAttribute(ATTR_NO_AUTOSTART, '');
    prop.setAttribute('name', 'foo');

    ent.append(prop);
    document.body.append(ent, worker);

    const viewComponent = ent.viewComponent;
    const uuid = ent.uuid;

    await removeAndSettle(ent);
    await removeAndSettle(worker);

    expect(ent.isDestroyed).toBe(true);
    expect(prop.isDestroyed).toBe(true);
    expect(worker.isDestroyed).toBe(true);

    document.body.append(ent, worker);

    expect(ent.isDestroyed).toBe(false);
    expect(prop.isDestroyed).toBe(false);

    // the entity is the same one it was: what the element let go of are its subscriptions, and
    // the component behind them stayed where it was — uuid, entity and properties included
    expect(ent.viewComponent).toBe(viewComponent);
    expect(ent.uuid).toBe(uuid);

    // and the subscriptions are back: an attribute write reaches the signals, the reflection and
    // the entity behind them again
    ent.setAttribute(ATTR_TOKEN, 'back');
    prop.setAttribute(ATTR_VALUE, 'back');

    expect(ent.token).toBe('back');
    expect(ent.viewComponent?.token).toBe('back');
    expect(prop.value).toBe('back');

    // <shae-worker> is the exception, and deliberately so: its teardown takes the environment with
    // it, and an environment cannot be brought back. The element refuses the return instead of
    // pretending to be the one it was
    expect(worker.isDestroyed).toBe(true);
  });

  it('leaves a destroyed but still connected <shae-prop> alone when a booked host lookup comes due', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    const prop = document.createElement(SHAE_PROP) as ShaePropElement;
    prop.setAttribute('name', 'foo');

    // `ent` connects first and on its own: happy-dom fires a batch-connected subtree's
    // `connectedCallback`s child-before-parent, the reverse of the tree order real browsers use,
    // so appending both in one call would have `prop` ask before `ent` is there to answer. Adding
    // `prop` as a second step, once `ent` already listens, keeps the case about the gate below and
    // off an environment quirk neither side of it is written to depend on.
    document.body.append(ent);
    ent.append(prop);

    expect(prop.entNode, 'the element found its host on connect').toBe(ent);

    // books a round on the gate: the re-request channel reaches this element over a listener
    // that sits on the host for as long as the host answers for it
    ent.dispatchEvent(new CustomEvent(ReRequestEntHostEventName, {detail: {requester: ent}}));

    // destroyed by hand while it is still in the document — the case `isConnected` alone does
    // not separate. The write straight after says what the teardown left behind: no host
    prop.destroy();
    prop.entNode = undefined;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(prop.entNode, 'the round came due on a destroyed element and did nothing').toBeUndefined();

    // and it took no registration back on the way: a second re-request would only reach this
    // element over a listener the teardown took off, and a lookup that ran would have put one back
    ent.dispatchEvent(new CustomEvent(ReRequestEntHostEventName, {detail: {requester: ent}}));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(prop.entNode, 'and it is still listening on nothing').toBeUndefined();
  });

  it('holds what was written to a torn-down <shae-ent>, in the signal and on the attribute', async () => {
    const ent = document.createElement(SHAE_ENT) as ShaeEntElement;
    ent.setAttribute(ATTR_TOKEN, 'before');
    document.body.append(ent);

    const viewComponent = ent.viewComponent;

    await removeAndSettle(ent);
    expect(ent.isDestroyed).toBe(true);

    // written while the element is released: the signals are alive, so the values land, and
    // nothing is listening to carry them onto the attributes yet
    ent.token = 'after';
    ent.ns = 'reachability-other-ns';
    ent.forwardCustomEvents$.set(new Set(['score-changed']));

    document.body.append(ent);

    // the signal is the truth, and coming back must not overwrite it from an attribute that was
    // left standing on the old value
    expect(ent.token, 'token').toBe('after');
    expect(ent.getAttribute(ATTR_TOKEN), 'token attribute').toBe('after');
    expect(ent.viewComponent, 'the same entity').toBe(viewComponent);
    expect(ent.viewComponent?.token, 'the token reached the entity').toBe('after');

    expect(ent.ns, 'ns').toBe('reachability-other-ns');
    expect(ent.getAttribute(ATTR_NS), 'ns attribute').toBe('reachability-other-ns');

    expect(ent.forwardCustomEvents$.value, 'the event filter').toEqual(new Set(['score-changed']));
    expect(ent.getAttribute(ATTR_FORWARD_CUSTOM_EVENTS), 'the filter attribute').toBe('score-changed');
  });

  it('stops answering for a <shae-ent> torn down by hand while it is still in the document', async () => {
    const host = document.createElement(SHAE_ENT) as ShaeEntElement;
    host.setAttribute(ATTR_TOKEN, 'host');
    document.body.append(host);

    host.destroy();
    expect(host.isDestroyed).toBe(true);
    expect(host.isConnected, 'still in the document').toBe(true);

    // an element that holds none of its own bindings any more must not go on claiming the
    // entities and properties below it. Both are appended directly, so what is measured is the
    // answer this element gives and not the order a subtree connects in
    const child = document.createElement(SHAE_ENT) as ShaeEntElement;
    const prop = document.createElement(SHAE_PROP) as ShaePropElement;
    prop.setAttribute('name', 'foo');
    host.append(child);
    host.append(prop);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(child.entParentNode, 'the entity below it finds no parent here').toBeUndefined();
    expect(prop.entNode, 'the property below it finds no host here').toBeUndefined();

    host.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
